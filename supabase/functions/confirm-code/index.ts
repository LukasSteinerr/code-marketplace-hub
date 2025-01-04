import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );

    // Get game code details
    const { data: game, error: gameError } = await supabaseAdmin
      .from("game_codes")
      .select(`
        *,
        sellers (
          stripe_account_id
        )
      `)
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      throw new Error("Game code not found");
    }

    const FRONTEND_URL = Deno.env.get("FRONTEND_URL") ?? "http://localhost:5173";
    const verifyUrl = `${FRONTEND_URL}/verify-code/${gameId}`;
    
    // Send email with verification links
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from: "Game Store <onboarding@resend.dev>",
        to: [game.buyer_email],
        subject: `Your Game Code for ${game.title}`,
        html: `
          <h1>Thank you for your purchase!</h1>
          <p>Here is your game code for ${game.title}:</p>
          <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <code style="font-size: 18px; font-weight: bold;">${game.code_text}</code>
          </div>
          <p>Please verify that this code works by redeeming it on the appropriate platform.</p>
          <div style="margin: 30px 0;">
            <p>After testing the code, please click one of these buttons:</p>
            <div style="margin: 20px 0;">
              <a href="${verifyUrl}?action=verify" style="background-color: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
                Code Works - Release Payment
              </a>
              <a href="${verifyUrl}?action=dispute" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Code Doesn't Work - Report Issue
              </a>
            </div>
          </div>
          <p>If you have any issues, please contact our support team.</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Failed to send email:", errorText);
      throw new Error("Failed to send game code email");
    }

    // Update game code status
    const { error: updateError } = await supabaseAdmin
      .from("game_codes")
      .update({ 
        payment_status: "paid",
        updated_at: new Date().toISOString()
      })
      .eq("id", gameId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});