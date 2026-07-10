import { NextResponse } from "next/server";

import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  createZone,
  getDeliveryConfig,
  saveDeliveryConfig,
  updateZone,
  upsertSchedules,
} from "@/lib/server/delivery-config-repository";
import type {
  DeliveryScheduleConfig,
  DeliveryZoneConfig,
} from "@/lib/delivery/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function unauthorized() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await isAdminAuthorizedAsync())) return unauthorized();

  const config = await getDeliveryConfig();
  return NextResponse.json(config, {
    headers: { "Cache-Control": "no-store" },
  });
}

type PutBody = {
  zones?: DeliveryZoneConfig[];
  schedules?: DeliveryScheduleConfig[];
  addZone?: { name: string; cost: number };
  updateZone?: {
    id: string;
    patch: Partial<Pick<DeliveryZoneConfig, "name" | "cost" | "isActive">>;
  };
};

export async function PUT(request: Request) {
  if (!(await isAdminAuthorizedAsync())) return unauthorized();

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  let config = await getDeliveryConfig();

  if (body.addZone) {
    config = createZone(config, body.addZone);
  }

  if (body.updateZone) {
    config = updateZone(config, body.updateZone.id, body.updateZone.patch);
  }

  if (body.zones) {
    config = { ...config, zones: body.zones };
  }

  if (body.schedules) {
    config = upsertSchedules(config, body.schedules);
  }

  const saved = await saveDeliveryConfig(config);
  return NextResponse.json(saved, {
    headers: { "Cache-Control": "no-store" },
  });
}
