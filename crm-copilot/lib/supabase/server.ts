import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Check crm-copilot/.env.local",
    );
  }
  return url;
}

/** Server client with the anon key — respects RLS once you enable it. */
export function createServerAnonClient(): SupabaseClient {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Check crm-copilot/.env.local",
    );
  }

  return createClient(getSupabaseUrl(), anonKey, {
    auth: {
      // Server requests are short-lived; do not persist sessions in Node.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Server client with the service_role key — bypasses RLS.
 * Seed + trusted backend jobs only. Never pass this client to the frontend.
 */
export function createServiceRoleClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Check crm-copilot/.env.local",
    );
  }

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
