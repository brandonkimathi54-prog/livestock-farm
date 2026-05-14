import { createBrowserClient } from '@supabase/ssr'
import type { Session } from '@supabase/supabase-js'

// Add error handling to prevent crashes during static build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This helps identify the issue during build without breaking the entire process
  console.warn("Supabase variables are missing.")
}

export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
)

// Safe wrapper functions that handle null supabase client
export const safeSupabaseCall = async <T>(
  operation: (client: any) => Promise<T>,
  fallback: T
) => {
  if (!supabase) {
    console.warn('Supabase client not initialized, returning fallback');
    return fallback;
  }
  
  try {
    return await operation(supabase);
  } catch (error) {
    console.error('Supabase operation failed:', error);
    return fallback;
  }
};

// Safe auth functions
export const safeGetSession = async (): Promise<Session | null> => {
  return safeSupabaseCall(
    async (client) => client.auth.getSession(),
    null
  );
};

export const safeOnAuthStateChange = (callback: (event: any, session: Session | null) => void) => {
  if (!supabase) return null;
  
  const { data: listener } = supabase.auth.onAuthStateChange(callback);
  return listener;
};
