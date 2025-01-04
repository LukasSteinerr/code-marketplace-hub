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
    const STRIPE_CHECKOUT_WEBHOOK_SECRET = Deno.env.get('STRIPE_CHECKOUT_WEBHOOK_SECRET');
    if (!STRIPE_CHECKOUT_WEBHOOK_SECRET) {
      throw new Error('STRIPE_CHECKOUT_WEBHOOK_SECRET is not set');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Clone the request to read it multiple times
    const clonedReq = req.clone();
    const signature = req.headers.get('stripe-signature');
    const body = await clonedReq.text();

    console.log('Raw body:', body);
    console.log('Signature:', signature);

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      STRIPE_CHECKOUT_WEBHOOK_SECRET,
    );

    console.log('Event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const gameId = session.metadata.gameId;

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      );

      // Update the game code status to sold
      const { error: updateError } = await supabaseClient
        .from('game_codes')
        .update({ status: 'sold' })
        .eq('id', gameId);

      if (updateError) {
        throw new Error(`Error updating game code: ${updateError.message}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});