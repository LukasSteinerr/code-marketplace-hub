import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameId, action } = await req.json();
    
    if (!gameId || !action) {
      throw new Error("Missing required parameters");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );

    // Get game code details
    const { data: game, error: gameError } = await supabaseAdmin
      .from("game_codes")
      .select("*, sellers(stripe_account_id)")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      throw new Error("Game code not found");
    }

    if (action === "verify") {
      // Check available balance first
      const balance = await stripe.balance.retrieve();
      console.log('Current Stripe balance:', JSON.stringify(balance, null, 2));

      // Get the payment intent to check the currency
      const paymentIntent = game.payment_intent_id ? 
        await stripe.paymentIntents.retrieve(game.payment_intent_id) : null;
      
      const currency = paymentIntent?.currency || 'usd';
      console.log('Payment currency:', currency);

      // Find balance in the correct currency
      const availableBalance = balance.available.find(bal => bal.currency === currency)?.amount || 0;
      console.log(`Available balance in ${currency}:`, availableBalance);

      // Calculate transfer amount in the same currency
      const transferAmount = Math.round(game.price * 90); // 90% to seller
      console.log('Transfer amount:', transferAmount);

      console.log('Transfer attempt details:', {
        price: game.price,
        availableBalance: availableBalance / 100,
        transferAmount: transferAmount / 100,
        difference: (availableBalance - transferAmount) / 100,
        currency: currency,
        stripeAccountId: game.sellers?.stripe_account_id
      });

      if (availableBalance < transferAmount) {
        throw new Error(`Insufficient balance. Available: $${availableBalance/100}, Required: $${transferAmount/100}. Please add funds using test card 4000000000000077`);
      }

      // Release payment to seller
      if (game.payment_intent_id && game.sellers?.stripe_account_id) {
        console.log('Attempting transfer with details:', {
          amount: transferAmount,
          currency: currency,
          destination: game.sellers.stripe_account_id,
          transferGroup: `game_${gameId}`,
        });

        const transfer = await stripe.transfers.create({
          amount: transferAmount,
          currency: currency,
          destination: game.sellers.stripe_account_id,
          transfer_group: `game_${gameId}`,
          description: `Payment for verified game code ${gameId}`,
        });

        console.log('Transfer successful:', {
          transferId: transfer.id,
          amount: transfer.amount,
          currency: transfer.currency,
          destination: transfer.destination,
          status: transfer.status
        });
      }

      // Update game status
      const { error: updateError } = await supabaseAdmin
        .from("game_codes")
        .update({ 
          payment_status: "released",
          status: "sold",
          updated_at: new Date().toISOString()
        })
        .eq("id", gameId);

      if (updateError) throw updateError;

    } else if (action === "dispute") {
      // Mark as disputed and handle refund if needed
      const { error: disputeError } = await supabaseAdmin
        .from("game_codes")
        .update({ 
          payment_status: "disputed",
          updated_at: new Date().toISOString()
        })
        .eq("id", gameId);

      if (disputeError) throw disputeError;

      // Refund the payment if it exists
      if (game.payment_intent_id) {
        const refund = await stripe.refunds.create({
          payment_intent: game.payment_intent_id,
        });

        console.log('Refund processed:', {
          refundId: refund.id,
          amount: refund.amount,
          status: refund.status
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error processing verification:', {
      error: error.message,
      type: error.type,
      code: error.code,
      requestId: error.requestId,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.code === 'balance_insufficient' ? 
          'To add funds in test mode, create a charge using card number 4000000000000077' : undefined
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});