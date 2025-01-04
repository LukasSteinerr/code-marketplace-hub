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
      const gameId = session.metadata?.gameId;
      const customerEmail = session.customer_details?.email;

      if (!gameId) {
        console.error('No gameId found in session metadata');
        throw new Error('No gameId found in session metadata');
      }

      if (!customerEmail) {
        console.error('No customer email found in session');
        throw new Error('No customer email found in session');
      }

      console.log('Processing completed checkout for game:', gameId);

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

      // Get the game code and update its status
      const { data, error: updateError } = await supabaseAdmin
        .from('game_codes')
        .update({ 
          status: 'sold',
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .eq('status', 'available')
        .select('code_text, title')
        .single();

      if (updateError) {
        console.error('Error updating game code:', updateError);
        throw new Error(`Error updating game code: ${updateError.message}`);
      }

      if (!data) {
        console.error('No game code was updated - it may not exist or already be sold');
        throw new Error('Failed to update game code status');
      }

      // Send email with game code to customer using Resend's default domain
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Acme <onboarding@resend.dev>', // Using Resend's default sending domain
          to: customerEmail,
          subject: `Your Game Code for ${data.title}`,
          html: `
            <h1>Thank you for your purchase!</h1>
            <p>Here is your game code for ${data.title}:</p>
            <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <code style="font-size: 18px; font-weight: bold;">${data.code_text}</code>
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

      console.log('Successfully updated game code status and sent email to customer');
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