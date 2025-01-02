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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Using service role key to bypass RLS
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get seller data
    const { data: seller } = await supabaseClient
      .from('sellers')
      .select('stripe_account_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!seller?.stripe_account_id) {
      throw new Error('No Stripe account found');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get Stripe account status
    const account = await stripe.accounts.retrieve(seller.stripe_account_id);
    console.log('Stripe account status:', {
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
    });

    let status;
    if (account.charges_enabled && account.details_submitted && account.payouts_enabled) {
      status = 'active';
    } else if (account.details_submitted) {
      status = 'pending';
    } else {
      status = 'onboarding';
    }

    // Update seller status in database
    const { error: updateError } = await supabaseClient
      .from('sellers')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating seller status:', updateError);
      throw updateError;
    }

    console.log('Successfully updated seller status to:', status);

    return new Response(
      JSON.stringify({ status }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking account status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});