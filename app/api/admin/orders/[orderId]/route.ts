import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import {
  deleteServerOrder,
  updateServerOrderDetails,
} from "@/lib/server/order-repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ orderId: string }> };

const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(999),
  unitPrice: z.number().int().min(0).max(10_000_000),
});

const patchSchema = z.object({
  client: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(6).max(30),
    address: z.string().trim().max(300).optional(),
    landmark: z.string().trim().max(300).optional(),
    message: z.string().trim().max(500).optional(),
  }),
  deliveryFee: z.number().int().min(0).max(1_000_000).optional(),
  items: z.array(itemSchema).min(1).max(50),
});

/** Édition complète (client + articles) d'une commande — admin uniquement. */
export async function PATCH(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { orderId } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètres invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const order = await updateServerOrderDetails(orderId, parsed.data);
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  void appendAdminActionLog({
    adminName: await getAdminDisplayNameAsync(),
    source: "manual",
    action: "order_edit",
    summary: `Commande modifiée ${orderId}`,
    details: { orderId },
  });

  return NextResponse.json({ order });
}

/**
 * Suppression définitive — uniquement pour les commandes non payées (recue)
 * ou déjà annulées. Pour les autres, l'admin doit passer par « Annuler »
 * (garde une trace comptable).
 */
export async function DELETE(request: Request, context: RouteContext) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { orderId } = await context.params;
  const result = await deleteServerOrder(orderId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error === "Commande introuvable." ? 404 : 409 },
    );
  }

  void appendAdminActionLog({
    adminName: await getAdminDisplayNameAsync(),
    source: "manual",
    action: "order_delete",
    summary: `Commande supprimée ${orderId}`,
    details: { orderId },
  });

  return NextResponse.json({ ok: true });
}
