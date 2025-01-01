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
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No Stripe signature found');
    }

    const body = await req.text();
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Processing webhook event:', event.type);

    if (event.type === 'account.updated') {
      const account = event.data.object;
      
      // Find the seller by stripe_account_id
      const { data: seller, error: findError } = await supabaseClient
        .from('sellers')
        .select('id')
        .eq('stripe_account_id', account.id)
        .single();

      if (findError) {
        throw findError;
      }

      if (!seller) {
        throw new Error('Seller not found');
      }

      // Check if the account is fully onboarded
      const isActive = 
        account.charges_enabled && 
        account.details_submitted && 
        account.payouts_enabled;

      // Update seller status
      const { error: updateError } = await supabaseClient
        .from('sellers')
        .update({ 
          status: isActive ? 'active' : 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', seller.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`Updated seller ${seller.id} status to ${isActive ? 'active' : 'pending'}`);
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
        status: 500,
      }
    );
  }
});