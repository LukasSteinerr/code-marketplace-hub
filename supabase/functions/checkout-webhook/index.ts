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
      console.error('No stripe signature found');
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
      console.error('Webhook secret not found');
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
        console.error('No gameId found in session metadata');
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
      const { data, error: updateError } = await supabaseAdmin
        .from('game_codes')
        .update({ 
          status: 'sold',
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .eq('status', 'available')
        .select()
        .single();

      if (updateError) {
        console.error('Error updating game code:', updateError);
        throw new Error(`Error updating game code: ${updateError.message}`);
      }

      if (!data) {
        console.error('No game code was updated - it may not exist or already be sold');
        throw new Error('Failed to update game code status');
      }

      console.log('Successfully updated game code status to sold:', data);
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