import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&no-check';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create the crypto provider for async signature verification
const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get the signature from the headers
    const signature = req.headers.get('stripe-signature');
    console.log('Received webhook with signature:', signature);
    
    if (!signature) {
      console.error('No Stripe signature found in headers');
      return new Response(
        JSON.stringify({ 
          error: 'No Stripe signature found', 
          details: 'The webhook request is missing the stripe-signature header'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get the raw request body
    const rawBody = await req.text();
    console.log('Raw body length:', rawBody.length);
    console.log('Raw body:', rawBody);
    
    if (!Deno.env.get('STRIPE_WEBHOOK_SECRET')) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error', 
          details: 'STRIPE_WEBHOOK_SECRET is not configured'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Verify the event using the async version with the crypto provider
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || '',
        undefined,
        cryptoProvider
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', {
        error: err.message,
        type: err.type,
        stack: err.stack
      });
      return new Response(
        JSON.stringify({ 
          error: 'Webhook signature verification failed', 
          details: err.message,
          type: err.type
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Processing webhook event:', event.type);

    // Create a Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Processing successful checkout session:', session.id);

      if (!session.metadata?.gameId) {
        console.error('No gameId found in session metadata');
        return new Response(
          JSON.stringify({ 
            error: 'Invalid session data', 
            details: 'No gameId found in session metadata'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      try {
        // Update game code status to 'sold'
        const { error: updateError } = await supabaseAdmin
          .from('game_codes')
          .update({ 
            status: 'sold',
            updated_at: new Date().toISOString()
          })
          .eq('id', session.metadata.gameId)
          .eq('status', 'available'); // Only update if it's still available

        if (updateError) {
          console.error('Error updating game code status:', {
            error: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          });
          throw updateError;
        }
        
        console.log('Successfully marked game code as sold:', session.metadata.gameId);
      } catch (error) {
        console.error('Database operation failed:', {
          error: error.message,
          details: error.details,
          hint: error.hint
        });
        return new Response(
          JSON.stringify({ 
            error: 'Database operation failed', 
            details: error.message
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook processing failed:', {
      error: error.message,
      stack: error.stack,
      type: error.type
    });
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed', 
        details: error.message,
        type: error.type
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});