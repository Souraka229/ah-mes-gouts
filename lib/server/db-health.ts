import { getPrisma } from "@/lib/prisma";
import { SUPABASE_PROJECT_URL, isSupabaseConfigured } from "@/lib/supabase/env";

export type HealthCheckResult = {
  ok: boolean;
  storage: "json" | "postgres" | "unknown";
  details: Record<string, string>;
};

async function checkPrisma(): Promise<{ ok: boolean; details: string }> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, details: "DATABASE_URL non définie" };
  }
  try {
    const prisma = getPrisma();
    const [products, drivers] = await Promise.all([
      prisma.product.count(),
      prisma.driver.count(),
    ]);
    return {
      ok: true,
      details: `Prisma OK — ${products} produit(s), ${drivers} livreur(s)`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connexion Prisma échouée";
    return { ok: false, details: msg };
  }
}

async function checkSupabaseRest(): Promise<{ ok: boolean; details: string }> {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    return { ok: false, details: "Clés Supabase non configurées dans .env.local" };
  }

  try {
    const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, details: `Supabase REST HTTP ${res.status}` };
    }
    return { ok: true, details: "Supabase REST joignable (RESTAURANTGLASCE)" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connexion échouée";
    return { ok: false, details: msg };
  }
}

export async function runHealthCheck(): Promise<HealthCheckResult> {
  const details: Record<string, string> = {};

  const prisma = await checkPrisma();
  details.postgres = prisma.details;

  if (isSupabaseConfigured()) {
    const sb = await checkSupabaseRest();
    details.supabase = sb.details;
    return {
      ok: prisma.ok && sb.ok,
      storage: "postgres",
      details,
    };
  }

  details.supabase = "En attente — ajoutez les clés API dans .env.local";

  return {
    ok: prisma.ok,
    storage: prisma.ok ? "postgres" : "unknown",
    details,
  };
}
