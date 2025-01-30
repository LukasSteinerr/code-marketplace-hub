import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
        subject: `Verify Your Game Code for ${game.title}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .container { background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .game-code { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
                .code { font-family: monospace; font-size: 24px; color: #2563eb; font-weight: bold; }
                .button-container { text-align: center; margin: 30px 0; }
                .button { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 0 10px; }
                .success-button { background-color: #22c55e; color: white; }
                .error-button { background-color: #ef4444; color: white; }
                .instructions { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-top: 20px; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Your Game Code is Ready! 🎮</h1>
                </div>
                
                <p>Thank you for your purchase of <strong>${game.title}</strong>!</p>
                
                <div class="game-code">
                  <p>Here's your game code:</p>
                  <p class="code">${game.code_text}</p>
                  <p>Platform: <strong>${game.platform}</strong></p>
                </div>

                <div class="instructions">
                  <h2>Next Steps:</h2>
                  <ol>
                    <li>Copy your game code</li>
                    <li>Redeem it on your ${game.platform} account</li>
                    <li>Verify that the code works by clicking the appropriate button below</li>
                  </ol>
                </div>

                <div class="button-container">
                  <a href="${verifyUrl}?action=verify" class="button success-button">
                    ✅ Code Works - Release Payment
                  </a>
                  <a href="${verifyUrl}?action=dispute" class="button error-button">
                    ❌ Code Doesn't Work
                  </a>
                </div>

                <div class="footer">
                  <p>Having trouble? Contact our support team for assistance.</p>
                  <p>Please verify the code within 24 hours to ensure timely payment to the seller.</p>
                </div>
              </div>
            </body>
          </html>
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