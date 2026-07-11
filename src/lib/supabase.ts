import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (browserClient) return browserClient;

  browserClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return browserClient;
}
