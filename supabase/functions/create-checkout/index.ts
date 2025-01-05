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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the game details and seller's Stripe account ID
    const { data: game, error: gameError } = await supabaseClient
      .from('game_codes')
      .select(`
        *,
        seller:sellers!game_codes_seller_id_sellers_fkey (
          stripe_account_id,
          status
        )
      `)
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      console.error('Game fetch error:', gameError);
      throw new Error('Game not found');
    }

    // Verify seller's Stripe account is properly configured
    if (!game.seller?.stripe_account_id || game.seller.status !== 'active') {
      console.error('Seller not configured:', {
        stripe_account_id: game.seller?.stripe_account_id,
        status: game.seller?.status
      });
      throw new Error('Seller not properly configured');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Calculate platform fee (10%)
    const amount = Math.round(game.price * 100); // Convert to cents
    const applicationFeeAmount = Math.round(amount * 0.10); // 10% platform fee

    // Get the origin and ensure it's HTTPS for non-localhost
    const frontendUrl = Deno.env.get('FRONTEND_URL') || '';
    const origin = req.headers.get('origin') || frontendUrl;
    const baseUrl = origin.includes('localhost') ? origin : origin.replace(/^http:/, 'https:');

    console.log('Creating checkout session with URLs:', {
      success: `${baseUrl}/game/${gameId}?status=success`,
      cancel: `${baseUrl}/game/${gameId}?status=cancelled`
    });

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: game.title,
            description: game.description || undefined,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/game/${gameId}?status=success`,
      cancel_url: `${baseUrl}/game/${gameId}?status=cancelled`,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: game.seller.stripe_account_id,
        },
      },
      metadata: {
        gameId: game.id,
        sellerId: game.seller_id,
      },
    });

    // Update game code with session ID
    const { error: updateError } = await supabaseClient
      .from('game_codes')
      .update({ 
        payment_intent_id: session.payment_intent,
        payment_status: 'pending'
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Game update error:', updateError);
      throw updateError;
    }

    console.log('Checkout session created:', session.id);
    return new Response(
      JSON.stringify({ url: session.url }),
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