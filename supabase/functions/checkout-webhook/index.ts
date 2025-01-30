import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No stripe signature found in headers');
      throw new Error('No stripe signature found');
    }

    const rawBody = await req.text();
    console.log('Raw body received:', rawBody.substring(0, 100) + '...');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        Deno.env.get('STRIPE_CHECKOUT_WEBHOOK_SECRET') || '',
        undefined,
        Stripe.createSubtleCryptoProvider()
      );
    } catch (err) {
      console.error('Error constructing webhook event:', err);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    console.log('Event type:', event.type);
    console.log('Event data:', JSON.stringify(event.data.object));

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      console.log('Updating game code:', session.metadata.gameId);

      const { error: updateError } = await supabaseClient
        .from('game_codes')
        .update({
          status: 'sold',
          payment_status: 'completed',
          payment_intent_id: session.payment_intent,
          buyer_email: session.customer_details.email,
        })
        .eq('id', session.metadata.gameId);

      if (updateError) {
        console.error('Error updating game code:', updateError);
        throw updateError;
      }

      // Send purchase notification emails
      try {
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-purchase-emails`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              gameId: session.metadata.gameId,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error('Error sending purchase emails:', error);
        } else {
          console.log('Purchase emails sent successfully');
        }
      } catch (error) {
        console.error('Error calling send-purchase-emails function:', error);
      }

      console.log('Successfully updated game code');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        type: 'webhook_error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});