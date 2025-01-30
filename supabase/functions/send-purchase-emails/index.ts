import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { BuyerEmail } from './_templates/buyer-email.tsx';
import { SellerEmail } from './_templates/seller-email.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameId } = await req.json();

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get game details including seller profile
    const { data: game, error: gameError } = await supabaseAdmin
      .from('game_codes')
      .select(`
        *,
        seller_profile:profiles!game_codes_seller_profile_fkey(*)
      `)
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      throw new Error('Game not found');
    }

    console.log('Sending emails for game:', game.title);

    // Send email to buyer
    if (game.buyer_email) {
      const buyerHtml = await renderAsync(
        React.createElement(BuyerEmail, {
          gameTitle: game.title,
          gameCode: game.code_text,
          platform: game.platform,
          price: game.price,
        })
      );

      const buyerEmail = await resend.emails.send({
        from: "Game Store <onboarding@resend.dev>",
        to: [game.buyer_email],
        subject: `Your game code for ${game.title}`,
        html: buyerHtml,
      });

      console.log('Buyer email sent:', buyerEmail);
    }

    // Send email to seller
    if (game.seller_profile?.email) {
      const sellerHtml = await renderAsync(
        React.createElement(SellerEmail, {
          gameTitle: game.title,
          price: game.price,
          buyerEmail: game.buyer_email || 'Unknown',
        })
      );

      const sellerEmail = await resend.emails.send({
        from: "Game Store <onboarding@resend.dev>",
        to: [game.seller_profile.email],
        subject: `Your game code for ${game.title} has been sold!`,
        html: sellerHtml,
      });

      console.log('Seller email sent:', sellerEmail);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error sending purchase emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});