import { createClient } from "@supabase/supabase-js";

import { SUPABASE_PROJECT_URL } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY manquante — voir dashboard Supabase → Settings → API",
    );
  }
  return createClient(SUPABASE_PROJECT_URL, anonKey);
}
