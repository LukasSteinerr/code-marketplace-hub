import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received webhook request');
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('No stripe signature found in headers');
      throw new Error('No stripe signature found');
    }

    const webhookSecret = Deno.env.get('STRIPE_CHECKOUT_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('Webhook secret not found in environment variables');
      throw new Error('Webhook secret not found');
    }

    // Get the raw body as a Uint8Array
    const rawBody = await req.arrayBuffer();
    const bodyText = new TextDecoder().decode(rawBody);
    
    console.log('Request body length:', bodyText.length);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    console.log('Attempting to construct Stripe event...');
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        bodyText,
        signature,
        webhookSecret
      );
      console.log('Successfully constructed Stripe event:', event.type);
    } catch (err) {
      console.error('Error constructing Stripe event:', err);
      throw err;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Processing checkout session:', session.id);
      
      const gameId = session.metadata?.gameId;
      const buyerId = session.metadata?.buyerId;
      const buyerEmail = session.customer_details?.email;

      if (!gameId) {
        console.error('No gameId found in session metadata:', session.metadata);
        throw new Error('No gameId found in session metadata');
      }

      console.log('Processing successful checkout for game:', gameId);

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          }
        }
      );

      const { data: gameCheck, error: checkError } = await supabaseAdmin
        .from('game_codes')
        .select('status')
        .eq('id', gameId)
        .single();

      if (checkError) {
        console.error('Error checking game status:', checkError);
        throw new Error(`Error checking game status: ${checkError.message}`);
      }

      console.log('Current game status:', gameCheck?.status);

      if (!gameCheck || gameCheck.status !== 'available') {
        console.error('Game is no longer available:', gameId);
        throw new Error('Game is no longer available');
      }

      const { error: updateError } = await supabaseAdmin
        .from('game_codes')
        .update({ 
          status: 'sold',
          payment_status: 'completed',
          buyer_id: buyerId,
          buyer_email: buyerEmail,
          payment_intent_id: session.payment_intent,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .eq('status', 'available');

      if (updateError) {
        console.error('Error updating game code:', updateError);
        throw new Error(`Error updating game code: ${updateError.message}`);
      }

      console.log('Successfully updated game status to sold');

      const confirmResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/confirm-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ gameId }),
        }
      );

      if (!confirmResponse.ok) {
        console.error('Error calling confirm-code function:', await confirmResponse.text());
      }

      console.log('Successfully processed checkout and sent verification email');
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.constructor.name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});