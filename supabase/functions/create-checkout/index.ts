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
    const { gameId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the game details and seller's Stripe account ID
    const { data: game, error: gameError } = await supabaseClient
      .from('game_codes')
      .select(`
        *,
        sellers (
          stripe_account_id
        )
      `)
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      throw new Error('Game not found');
    }

    const sellerStripeAccountId = game.sellers?.stripe_account_id;
    if (!sellerStripeAccountId) {
      throw new Error('Seller not properly configured');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Calculate platform fee (10%)
    const amount = Math.round(game.price * 100); // Convert to cents
    const applicationFeeAmount = Math.round(amount * 0.10); // 10% platform fee

    // Create PaymentIntent instead of a Checkout Session
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      application_fee_amount: applicationFeeAmount,
      metadata: {
        gameId: game.id,
        sellerId: game.seller_id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update game code with payment intent ID
    const { error: updateError } = await supabaseClient
      .from('game_codes')
      .update({ 
        payment_intent_id: paymentIntent.id,
        payment_status: 'pending'
      })
      .eq('id', gameId);

    if (updateError) {
      throw updateError;
    }

    console.log('Payment intent created:', paymentIntent.id);
    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});