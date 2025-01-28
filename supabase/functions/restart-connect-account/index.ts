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
    console.log('Starting restart-connect-account function');
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Initialize Supabase admin client
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

    // Get the user's session
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    console.log('Verifying user authentication');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication error:', userError);
      throw new Error('Not authenticated');
    }

    console.log('Getting seller record for user:', user.id);
    // Get the seller record to find the Stripe account ID
    const { data: seller, error: sellerError } = await supabaseClient
      .from('sellers')
      .select('stripe_account_id, status')
      .eq('id', user.id)
      .maybeSingle();

    if (sellerError) {
      console.error('Error fetching seller:', sellerError);
      throw sellerError;
    }

    if (seller?.stripe_account_id) {
      try {
        console.log('Deleting Stripe account:', seller.stripe_account_id);
        // Delete the Stripe Connect account
        await stripe.accounts.del(seller.stripe_account_id);
        console.log('Successfully deleted Stripe account');
      } catch (stripeError: any) {
        // If the account doesn't exist, we can proceed
        if (stripeError.code !== 'resource_missing') {
          console.error('Error deleting Stripe account:', stripeError);
          throw stripeError;
        }
        console.log('Stripe account not found, proceeding with cleanup');
      }
    }

    console.log('Updating seller record');
    // Update the seller record instead of deleting it
    const { error: updateError } = await supabaseClient
      .from('sellers')
      .update({
        stripe_account_id: null,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating seller:', updateError);
      throw updateError;
    }

    console.log('Successfully reset seller account');
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in restart-connect-account:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});