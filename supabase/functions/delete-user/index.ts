import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
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
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    console.log('Starting deletion process for user:', user.id);

    // Delete seller record first (if exists)
    const { error: sellerError } = await supabaseAdmin
      .from('sellers')
      .delete()
      .eq('id', user.id);

    if (sellerError) {
      console.error('Error deleting seller record:', sellerError);
      throw new Error('Failed to delete seller record');
    }

    // Delete game codes
    const { error: gameCodesError } = await supabaseAdmin
      .from('game_codes')
      .delete()
      .eq('seller_id', user.id);

    if (gameCodesError) {
      console.error('Error deleting game codes:', gameCodesError);
      throw new Error('Failed to delete game codes');
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      throw new Error('Failed to delete profile');
    }

    // Finally, delete the user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      throw deleteError;
    }

    console.log('Successfully deleted user and all associated data');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to delete user account'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});