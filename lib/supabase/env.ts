/** Projet Supabase RESTAURANTGLASCE — valeurs publiques (non secrètes). */
export const SUPABASE_PROJECT_REF = "ykzpdfwwjjdlhaulsaur";

export const SUPABASE_PROJECT_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  `https://${SUPABASE_PROJECT_REF}.supabase.co`;

export function isSupabaseConfigured(): boolean {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(anonKey || serviceKey);
}
