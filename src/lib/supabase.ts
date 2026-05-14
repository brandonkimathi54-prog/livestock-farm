import { createBrowserClient } from '@supabase/ssr'

// Add error handling to prevent crashes during static build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;
