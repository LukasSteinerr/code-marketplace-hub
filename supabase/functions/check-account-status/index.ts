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
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // Get seller data using maybeSingle() instead of single()
    const { data: sellerData, error: sellerError } = await supabaseClient
      .from('sellers')
      .select('stripe_account_id, status')
      .eq('id', user.id)
      .maybeSingle();

    if (sellerError) {
      console.error('Error fetching seller:', sellerError);
      throw sellerError;
    }

    // If no seller record exists, return pending status
    if (!sellerData) {
      return new Response(
        JSON.stringify({ status: 'pending' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // If no Stripe account ID, return current status
    if (!sellerData.stripe_account_id) {
      return new Response(
        JSON.stringify({ status: sellerData.status || 'pending' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    try {
      // Try to retrieve the account
      const account = await stripe.accounts.retrieve(sellerData.stripe_account_id);
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

      return new Response(
        JSON.stringify({ status }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      
      // If the account is invalid or not accessible, reset the seller status
      if (stripeError.code === 'account_invalid') {
        console.log('Resetting invalid seller account...');
        const { error: resetError } = await supabaseClient
          .from('sellers')
          .update({ 
            status: 'pending',
            stripe_account_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (resetError) {
          console.error('Error resetting seller:', resetError);
          throw resetError;
        }

        return new Response(
          JSON.stringify({ 
            status: 'pending',
            error: 'Stripe account access invalid. Please try onboarding again.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      throw stripeError;
    }

  } catch (error: any) {
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