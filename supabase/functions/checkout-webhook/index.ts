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
    // Get the stripe signature from the request headers
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      throw new Error('No stripe signature found');
    }

    // Get the raw body as text
    const body = await req.text();

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    // Verify the webhook signature
    const webhookSecret = Deno.env.get('STRIPE_CHECKOUT_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Webhook secret not found');
    }

    // Construct the event
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    console.log('Processing webhook event:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const gameId = session.metadata?.gameId;

      if (!gameId) {
        throw new Error('No gameId found in session metadata');
      }

      console.log('Processing completed checkout for game:', gameId);

      // Initialize Supabase client with service role key
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

      // Update the game code status to sold
      const { error: updateError } = await supabaseAdmin
        .from('game_codes')
        .update({ status: 'sold' })
        .eq('id', gameId);

      if (updateError) {
        console.error('Error updating game code:', updateError);
        throw new Error(`Error updating game code: ${updateError.message}`);
      }

      console.log('Successfully updated game code status to sold');
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});