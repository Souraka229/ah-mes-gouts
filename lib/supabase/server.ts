import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_PROJECT_URL } from "@/lib/supabase/env";

let serverClient: SupabaseClient | null = null;

/**
 * Client serveur (service role) — uniquement côté API / Server Components.
 * Ne jamais exposer SUPABASE_SERVICE_ROLE_KEY au navigateur.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  if (!serverClient) {
    serverClient = createClient(SUPABASE_PROJECT_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return serverClient;
}
