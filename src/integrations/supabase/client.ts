// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://laocnftisgmcjwylzgzz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhb2NuZnRpc2dtY2p3eWx6Z3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3Mzc5NTgsImV4cCI6MjA1MTMxMzk1OH0.YC4Ep1qZGCBWGgbM2KJtIB0KB5mc7xyMbH0ThIKLz0s";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);