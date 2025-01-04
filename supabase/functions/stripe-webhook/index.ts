import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
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
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || '',
        undefined,
        cryptoProvider
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

    console.log('Processing webhook event:', event.type);
    console.log('Event data:', JSON.stringify(event.data.object, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (event.type === 'account.updated') {
      const account = event.data.object;
      console.log('Processing account update for ID:', account.id);
      
      try {
        // First, try to find the seller by stripe_account_id
        const { data: existingSeller, error: sellerError } = await supabaseClient
          .from('sellers')
          .select('id')
          .eq('stripe_account_id', account.id)
          .maybeSingle();

        if (sellerError) {
          console.error('Error checking existing seller:', sellerError);
          throw sellerError;
        }

        const isActive = 
          account.charges_enabled && 
          account.details_submitted && 
          account.payouts_enabled;

        console.log('Account status check:', {
          charges_enabled: account.charges_enabled,
          details_submitted: account.details_submitted,
          payouts_enabled: account.payouts_enabled,
          isActive
        });

        if (existingSeller) {
          console.log('Updating existing seller:', existingSeller.id);
          const { error: updateError } = await supabaseClient
            .from('sellers')
            .update({ 
              status: isActive ? 'active' : 'pending',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSeller.id);

          if (updateError) {
            console.error('Error updating seller record:', updateError);
            throw updateError;
          }
          console.log('Successfully updated seller record');
        } else {
          console.error('No seller found for Stripe account:', account.id);
          // We'll just log this case instead of throwing an error
          // This can happen during initial account creation
        }
      } catch (error) {
        console.error('Error processing account update:', error);
        throw error;
      }
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