import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a custom crypto provider for Deno
const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(), // Use Fetch API for Deno
    });

    const signature = req.headers.get('stripe-signature');
    console.log('Received Stripe signature:', signature ? 'present' : 'missing');
    
    if (!signature) {
      throw new Error('No Stripe signature found');
    }

    const body = await req.text();
    console.log('Webhook raw body length:', body.length);
    console.log('Webhook secret present:', !!Deno.env.get('STRIPE_WEBHOOK_SECRET'));
    
    let event;

    try {
      // Use the asynchronous version of constructEvent with the crypto provider
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || '',
        undefined, // Optional: timestamp tolerance
        cryptoProvider // Pass the custom crypto provider
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
      
      // Get the Stripe account details to find the associated email
      const accountDetails = await stripe.accounts.retrieve(account.id);
      
      if (!accountDetails.email) {
        throw new Error('No email associated with Stripe account');
      }

      // Find the user by email
      const { data: { users }, error: userError } = await supabaseClient.auth.admin
        .listUsers();

      if (userError) throw userError;

      const user = users.find(u => u.email === accountDetails.email);
      if (!user) {
        throw new Error('No user found with matching email');
      }

      // Check if seller exists
      const { data: existingSeller } = await supabaseClient
        .from('sellers')
        .select('id')
        .eq('stripe_account_id', account.id)
        .maybeSingle();

      // Check if the account is fully onboarded
      const isActive = 
        account.charges_enabled && 
        account.details_submitted && 
        account.payouts_enabled;

      if (!existingSeller) {
        // Create new seller record
        console.log('Creating new seller record for user:', user.id);
        const { error: insertError } = await supabaseClient
          .from('sellers')
          .insert({ 
            id: user.id,
            stripe_account_id: account.id,
            status: isActive ? 'active' : 'pending',
            updated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      } else {
        // Update existing seller
        console.log('Updating existing seller:', existingSeller.id);
        const { error: updateError } = await supabaseClient
          .from('sellers')
          .update({ 
            status: isActive ? 'active' : 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSeller.id);

        if (updateError) throw updateError;
      }

      console.log(`Updated seller status to ${isActive ? 'active' : 'pending'}`);
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