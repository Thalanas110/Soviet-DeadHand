import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

export function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
  const key =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SERVICE_ROLE_KEY");
  if (!url || !key)
    throw new Error("Supabase service configuration is missing");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function publicClient(accessToken: string): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
  const key =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Supabase public configuration is missing");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
