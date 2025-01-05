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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check if seller already exists
    const { data: existingSeller } = await supabaseClient
      .from('sellers')
      .select('stripe_account_id')
      .eq('id', user.id)
      .maybeSingle();

    let accountId = existingSeller?.stripe_account_id;

    if (!accountId) {
      // Create new Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          user_id: user.id,
        },
      });
      accountId = account.id;

      // Create the seller record with pending status
      const { error: insertError } = await supabaseClient
        .from('sellers')
        .insert({
          id: user.id,
          stripe_account_id: accountId,
          status: 'onboarding',
        });

      if (insertError) {
        console.error('Error creating seller record:', insertError);
        throw insertError;
      }
    }

    // Get the base URL ensuring HTTPS for non-localhost
    const frontendUrl = Deno.env.get('FRONTEND_URL') || '';
    const origin = req.headers.get('origin') || frontendUrl;
    let baseUrl = origin;

    // Only use HTTP for localhost, force HTTPS for all other environments
    if (!baseUrl.includes('localhost')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }

    console.log('Creating account link with URLs:', {
      refresh: `${baseUrl}/profile`,
      return: `${baseUrl}/profile?status=success`
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/profile`,
      return_url: `${baseUrl}/profile?status=success`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({ url: accountLink.url }),
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