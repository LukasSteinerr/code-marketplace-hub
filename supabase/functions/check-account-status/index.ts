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
    console.log('Starting check-account-status function');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    console.log('Verifying user authentication');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication error:', userError);
      throw new Error('Not authenticated');
    }

    console.log('Getting seller data for user:', user.id);
    const { data: sellerData, error: sellerError } = await supabaseClient
      .from('sellers')
      .select('stripe_account_id, status')
      .eq('id', user.id)
      .maybeSingle();

    if (sellerError) {
      console.error('Error fetching seller:', sellerError);
      throw sellerError;
    }

    console.log('Seller data:', sellerData);

    if (!sellerData) {
      console.log('No seller record found, returning pending status');
      return new Response(
        JSON.stringify({ status: 'pending' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (!sellerData.stripe_account_id) {
      console.log('No Stripe account ID found, returning current status:', sellerData.status);
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
      console.log('Retrieving Stripe account:', sellerData.stripe_account_id);
      const account = await stripe.accounts.retrieve(sellerData.stripe_account_id);
      
      console.log('Stripe account status:', {
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
        capabilities: account.capabilities,
      });

      // Check if the account is fully enabled
      const isActive = account.charges_enabled && 
                      account.details_submitted && 
                      account.payouts_enabled;

      // Check if the account has completed onboarding
      const hasCompletedOnboarding = account.details_submitted;

      let status;
      if (isActive) {
        status = 'active';
        console.log('All requirements met, setting status to active');
      } else if (hasCompletedOnboarding) {
        status = 'pending';
        console.log('Onboarding completed but not fully enabled, setting status to pending');
      } else {
        status = 'onboarding';
        console.log('Onboarding incomplete, setting status to onboarding');
      }

      // Always update the status to ensure it's current
      console.log('Updating seller status to:', status);
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

      console.log('Successfully updated seller status');
      return new Response(
        JSON.stringify({ status }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      
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