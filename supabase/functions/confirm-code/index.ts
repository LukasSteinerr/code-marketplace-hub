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

    // Get game code details
    const { data: game, error: gameError } = await supabaseAdmin
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
      throw new Error('Game code not found');
    }

    if (!game.payment_intent_id) {
      throw new Error('No payment found for this game code');
    }

    const sellerStripeAccountId = game.sellers?.stripe_account_id;
    if (!sellerStripeAccountId) {
      throw new Error('Seller not properly configured');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    // Transfer the funds to the seller
    const transfer = await stripe.transfers.create({
      amount: Math.round(game.price * 90), // 90% of the price (10% platform fee)
      currency: 'usd',
      destination: sellerStripeAccountId,
      transfer_group: `game_${gameId}`,
      description: `Payment for game code ${gameId}`,
    });

    console.log('Transfer created:', transfer.id);

    // Update game code status
    const { error: updateError } = await supabaseAdmin
      .from('game_codes')
      .update({ 
        status: 'sold',
        payment_status: 'released',
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (updateError) {
      throw updateError;
    }

    // Send email with game code to buyer
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Acme <onboarding@resend.dev>',
        to: game.buyer_email,
        subject: `Your Game Code for ${game.title}`,
        html: `
          <h1>Thank you for your purchase!</h1>
          <p>Here is your game code for ${game.title}:</p>
          <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <code style="font-size: 18px; font-weight: bold;">${game.code_text}</code>
          </div>
          <p>Please redeem this code on the appropriate platform.</p>
          <p>If you have any issues, please contact our support team.</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Failed to send email:', errorText);
      throw new Error('Failed to send game code email');
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