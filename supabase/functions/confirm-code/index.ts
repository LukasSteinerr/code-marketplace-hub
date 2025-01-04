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

    // Get payment information
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('game_code_id', gameId)
      .eq('status', 'pending')
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    // Transfer the funds to the seller
    if (payment.stripe_account_id) {
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.floor(payment.amount * 0.8), // 80% to seller, 20% platform fee
          currency: 'usd',
          destination: payment.stripe_account_id,
          transfer_group: `game_${gameId}`,
          description: `Payment for game code ${gameId}`,
        });
        console.log('Transfer created:', transfer.id);
      } catch (transferError) {
        console.error('Failed to transfer funds to seller:', transferError);
        throw transferError;
      }
    }

    // Update payment status
    const { error: updatePaymentError } = await supabaseAdmin
      .from('payments')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      throw updatePaymentError;
    }

    // Update game code status
    const { error: updateGameError } = await supabaseAdmin
      .from('game_codes')
      .update({ 
        status: 'sold',
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (updateGameError) {
      throw updateGameError;
    }

    return new Response(
      JSON.stringify({ success: true }),
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