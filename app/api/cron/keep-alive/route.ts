import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";

/**
 * Ping silencieux de la base — empêche Supabase de mettre le projet en pause
 * après une période d'inactivité (7 jours sur l'offre gratuite).
 *
 * « Invisible » à dessein : aucune écriture, aucun journal admin, réponse
 * minimale. Une simple requête `SELECT 1` suffit à réarmer le compteur
 * d'inactivité de Supabase ; on ajoute un `count()` sur une vraie table pour
 * exercer le pooler comme le ferait le trafic normal.
 *
 * Appelé par GitHub Actions (voir .github/workflows/cron.yml) et exécutable
 * à la main via `npm run db:keep-alive`.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!secret?.trim()) {
      return NextResponse.json(
        { error: "CRON_SECRET non configuré en production" },
        { status: 503 },
      );
    }
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  } else if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    const products = await prisma.product.count();

    return NextResponse.json(
      { ok: true, products, tookMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ping base échoué";
    console.error("[cron/keep-alive]", message);
    return NextResponse.json(
      { ok: false, error: message, tookMs: Date.now() - startedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
