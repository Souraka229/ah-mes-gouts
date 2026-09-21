import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lieux de livraison — le tarif que la cliente paie.
 *
 * Le prix est porté par le lieu et non par la zone : « Hors Cotonou » va de
 * 2 000 à 4 000 F, et plusieurs paliers mélangent les tarifs. C'est **cette
 * table** que le serveur interroge pour facturer (`resolveDeliveryAreaPrice`),
 * donc corriger un tarif ici n'exige aucun redéploiement.
 */

function unauthorized() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
}

const areaSelect = {
  id: true,
  zoneId: true,
  name: true,
  price: true,
  sortOrder: true,
  isActive: true,
} as const;

export async function GET(request: Request) {
  if (!(await isAdminAuthorizedAsync())) return unauthorized();

  const zoneId = new URL(request.url).searchParams.get("zoneId")?.trim();

  const areas = await getPrisma().deliveryArea.findMany({
    where: zoneId ? { zoneId } : undefined,
    select: areaSelect,
    orderBy: [{ zoneId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ areas }, { headers: { "Cache-Control": "no-store" } });
}

const updateSchema = z.object({
  id: z.string().trim().min(1),
  price: z.number().int().positive().max(1_000_000).optional(),
  isActive: z.boolean().optional(),
  name: z.string().trim().min(1).max(80).optional(),
});

const createSchema = z.object({
  zoneId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  price: z.number().int().positive().max(1_000_000),
});

const putSchema = z.object({
  update: updateSchema.optional(),
  create: createSchema.optional(),
});

export async function PUT(request: Request) {
  if (!(await isAdminAuthorizedAsync())) return unauthorized();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success || (!parsed.data.update && !parsed.data.create)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const prisma = getPrisma();
  const adminName = await getAdminDisplayNameAsync();

  try {
    if (parsed.data.update) {
      const { id, ...patch } = parsed.data.update;
      const before = await prisma.deliveryArea.findUnique({
        where: { id },
        select: areaSelect,
      });
      if (!before) {
        return NextResponse.json({ error: "Lieu introuvable" }, { status: 404 });
      }

      const area = await prisma.deliveryArea.update({
        where: { id },
        data: patch,
        select: areaSelect,
      });

      void appendAdminActionLog({
        adminName,
        source: "manual",
        action: "delivery_area_update",
        summary:
          patch.price !== undefined && patch.price !== before.price
            ? `Livraison ${area.name} : ${before.price} F → ${area.price} F`
            : `Livraison ${area.name} modifiée`,
        details: { areaId: id, before, after: area },
      });

      return NextResponse.json({ area });
    }

    const { zoneId, name, price } = parsed.data.create!;
    const zone = await prisma.deliveryZone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      return NextResponse.json({ error: "Zone introuvable" }, { status: 404 });
    }

    const count = await prisma.deliveryArea.count({ where: { zoneId } });
    const area = await prisma.deliveryArea.create({
      data: { zoneId, name, price, sortOrder: count },
      select: areaSelect,
    });

    void appendAdminActionLog({
      adminName,
      source: "manual",
      action: "delivery_area_create",
      summary: `Livraison ${zone.name} : ajout de ${name} à ${price} F`,
      details: { areaId: area.id, zoneId },
    });

    return NextResponse.json({ area }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Écriture impossible";
    // Nom déjà pris dans cette zone (contrainte d'unicité).
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Ce lieu existe déjà dans cette zone." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
