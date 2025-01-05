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
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('No stripe signature found');
      throw new Error('No stripe signature found');
    }

    const body = await req.text();
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    const webhookSecret = Deno.env.get('STRIPE_CHECKOUT_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('Webhook secret not found');
      throw new Error('Webhook secret not found');
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log('Processing webhook event:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const gameId = session.metadata.gameId;
      const buyerId = session.metadata.buyerId;
      const buyerEmail = session.customer_details?.email;

      if (!gameId) {
        console.error('No gameId found in session metadata');
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

      // Get game details
      const { data: game, error: gameError } = await supabaseAdmin
        .from('game_codes')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) {
        console.error('Error fetching game details:', gameError);
        throw new Error(`Error fetching game details: ${gameError.message}`);
      }

      // Update game code status to sold and set the buyer_id
      const { error: updateError } = await supabaseAdmin
        .from('game_codes')
        .update({ 
          status: 'sold',
          payment_status: 'paid',
          buyer_id: buyerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (updateError) {
        console.error('Error updating game code:', updateError);
        throw new Error(`Error updating game code: ${updateError.message}`);
      }

      // Send confirmation email via Resend
      if (buyerEmail) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            },
            body: JSON.stringify({
              from: 'Game Store <onboarding@resend.dev>',
              to: [buyerEmail],
              subject: `Your Game Code Purchase: ${game.title}`,
              html: `
                <h1>Thank you for your purchase!</h1>
                <p>Here is your game code for ${game.title}:</p>
                <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <code style="font-size: 18px; font-weight: bold;">${game.code_text}</code>
                </div>
                <p>Platform: ${game.platform}</p>
                ${game.region ? `<p>Region: ${game.region}</p>` : ''}
                <p>Please redeem your code on the appropriate platform.</p>
                <p>If you have any issues, please contact our support team.</p>
              `,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('Failed to send email:', errorText);
            throw new Error('Failed to send confirmation email');
          }

          console.log('Confirmation email sent successfully');
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
          // Don't throw here, as we don't want to roll back the purchase if email fails
        }
      }

      console.log('Successfully processed checkout and updated game status to sold');
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
        status: 400,
      }
    );
  }
});