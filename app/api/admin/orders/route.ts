import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import {
  createManualServerOrder,
  getServerOrdersForAdmin,
} from "@/lib/server/order-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "100");
  const days = Number(searchParams.get("days") ?? "7");

  const orders = await getServerOrdersForAdmin({ limit, days });

  return NextResponse.json({ orders }, {
    headers: { "Cache-Control": "no-store" },
  });
}

const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().int().min(1).max(999),
  unitPrice: z.number().int().min(0).max(10_000_000),
});

const createSchema = z.object({
  client: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(6).max(30),
    address: z.string().trim().max(300).optional(),
    landmark: z.string().trim().max(300).optional(),
    message: z.string().trim().max(500).optional(),
  }),
  mode: z.enum(["delivery", "pickup", "dinein"]),
  zoneId: z.string().trim().min(1).max(60).nullish(),
  zoneName: z.string().trim().min(1).max(120).nullish(),
  deliveryFee: z.number().int().min(0).max(1_000_000).optional(),
  paymentMethod: z.enum(["mtn_momo", "moov_money", "celtiis_cash", "card"]),
  markPaid: z.boolean().optional(),
  items: z.array(itemSchema).min(1).max(50),
});

/** Création manuelle d'une commande (téléphone / boutique) par un admin. */
export async function POST(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètres invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const order = await createManualServerOrder(parsed.data);

  void appendAdminActionLog({
    adminName: await getAdminDisplayNameAsync(),
    source: "manual",
    action: "order_create",
    summary: `Commande manuelle créée ${order.id}`,
    details: { orderId: order.id },
  });

  return NextResponse.json({ order }, { status: 201 });
}
