import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get the signature from the headers
    const signature = req.headers.get('stripe-signature');
    console.log('Received webhook with signature:', signature);
    
    if (!signature) {
      throw new Error('No Stripe signature found');
    }

    // Get the raw request body
    const rawBody = await req.text();
    console.log('Raw body length:', rawBody.length);
    console.log('Webhook secret length:', Deno.env.get('STRIPE_WEBHOOK_SECRET')?.length);

    // Verify the event
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed', details: err.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Processing webhook event:', event.type);

    // Create a Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Processing successful checkout session:', session.id);

      // Update game code status to 'sold'
      if (session.metadata?.gameId) {
        const { error: updateError } = await supabaseAdmin
          .from('game_codes')
          .update({ 
            status: 'sold',
            updated_at: new Date().toISOString()
          })
          .eq('id', session.metadata.gameId);

        if (updateError) {
          console.error('Error updating game code status:', updateError);
          throw updateError;
        }
        console.log('Successfully marked game code as sold:', session.metadata.gameId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});