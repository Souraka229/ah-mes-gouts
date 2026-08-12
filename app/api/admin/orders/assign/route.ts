import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { getAdminContextAsync } from "@/lib/server/admin-auth";
import { assignOrderDriver } from "@/lib/server/order-repository";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1).max(50),
  driverId: z.string().min(1).nullable(),
});

/**
 * Assignation groupée d'une tournée.
 *
 * Une vague pleine, c'est 35 commandes à répartir : les assigner une par une
 * n'est pas tenable. L'admin sélectionne un lot et l'affecte d'un coup, et
 * peut répéter l'opération avec un autre lot vers un autre livreur.
 *
 * Chaque commande est traitée indépendamment : une commande qui n'est pas
 * encore « Prête » n'empêche pas les autres d'être assignées. Le détail des
 * échecs est renvoyé pour affichage.
 */
export async function POST(request: Request) {
  const admin = await getAdminContextAsync();
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Sélection invalide (1 à 50 commandes)." },
      { status: 400 },
    );
  }

  const { orderIds, driverId } = parsed.data;
  const unique = [...new Set(orderIds)];

  const assigned: string[] = [];
  const failed: { orderId: string; reason: string }[] = [];
  let driverName: string | null = null;

  for (const orderId of unique) {
    try {
      const order = await assignOrderDriver(orderId, driverId);
      if (!order) {
        failed.push({ orderId, reason: "Commande introuvable." });
        continue;
      }
      driverName = order.driverName ?? driverName;
      assigned.push(orderId);
    } catch (error) {
      failed.push({
        orderId,
        reason:
          error instanceof Error ? error.message : "Assignation impossible.",
      });
    }
  }

  if (assigned.length > 0) {
    await appendAdminActionLog({
      adminName: admin.name,
      source: "driver",
      action: driverId ? "bulk_assigned" : "bulk_unassigned",
      summary: driverId
        ? `${assigned.length} commande(s) affectée(s) à ${driverName ?? "un livreur"}`
        : `${assigned.length} commande(s) désaffectée(s)`,
      details: { driverId, orderIds: assigned },
    }).catch(() => undefined);
  }

  return NextResponse.json({
    assignedCount: assigned.length,
    assigned,
    failed,
    driverName,
  });
}
