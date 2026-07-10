/** Projet Supabase RESTAURANTGLASCE — valeurs publiques (non secrètes). */
export const SUPABASE_PROJECT_REF = "ykzpdfwwjjdlhaulsaur";

export const SUPABASE_PROJECT_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  `https://${SUPABASE_PROJECT_REF}.supabase.co`;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
