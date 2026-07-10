import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import {
  createCatalogProduct,
  updateCatalogProduct,
  updateCatalogStock,
} from "@/lib/server/admin-catalog-repository";
import {
  getDeliveryConfig,
  saveDeliveryConfig,
  updateZone,
} from "@/lib/server/delivery-config-repository";
import type { ParsedAssistantAction } from "@/lib/admin-assistant/types";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

const DAY_MAP: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

export async function applyAssistantAction(
  parsed: ParsedAssistantAction,
  adminName: string,
): Promise<{ ok: true; message: string }> {
  const { action, payload } = parsed;

  if (action === "unknown") {
    throw new Error("Action inconnue — impossible d'appliquer.");
  }

  let message = parsed.summary;

  switch (action) {
    case "create_product": {
      const name = asString(payload.name);
      const price = asNumber(payload.price);
      const category = asString(payload.category) ?? "Entremets";
      if (!name || price === undefined) {
        throw new Error("create_product : nom et prix requis.");
      }
      const created = await createCatalogProduct({
        name,
        price,
        category,
        description: asString(payload.description),
        stock: asNumber(payload.stock),
      });
      message = `Produit créé : ${created.name}`;
      break;
    }
    case "update_product": {
      const ref =
        asString(payload.productRef) ?? asString(payload.name) ?? asString(payload.slug);
      if (!ref) throw new Error("update_product : produit introuvable.");
      const patch: Parameters<typeof updateCatalogProduct>[1] = {};
      const price = asNumber(payload.price);
      if (price !== undefined) patch.price = price;
      const name = asString(payload.name);
      if (name) patch.name = name;
      const category = asString(payload.category);
      if (category) patch.category = category;
      await updateCatalogProduct(ref, patch);
      break;
    }
    case "update_stock": {
      const ref = asString(payload.productRef) ?? asString(payload.name);
      const stock = asNumber(payload.stock);
      if (!ref || stock === undefined) {
        throw new Error("update_stock : produit et stock requis.");
      }
      await updateCatalogStock(ref, stock);
      break;
    }
    case "create_promo": {
      const ref = asString(payload.productRef) ?? asString(payload.name);
      const promoPrice = asNumber(payload.promotionPrice);
      if (!ref || promoPrice === undefined) {
        throw new Error("create_promo : produit et prix promo requis.");
      }
      await updateCatalogProduct(ref, {
        isPromotion: true,
        promotionPrice: promoPrice,
      });
      break;
    }
    case "toggle_zone": {
      const zoneName = asString(payload.zoneName) ?? asString(payload.name);
      if (!zoneName) throw new Error("toggle_zone : nom de zone requis.");
      let config = await getDeliveryConfig();
      const zone = config.zones.find((z) =>
        z.name.toLowerCase().includes(zoneName.toLowerCase()),
      );
      if (!zone) throw new Error(`Zone introuvable : ${zoneName}`);
      const isActive =
        typeof payload.isActive === "boolean" ? payload.isActive : !zone.isActive;
      config = updateZone(config, zone.id, { isActive });
      await saveDeliveryConfig(config);
      break;
    }
    case "update_zone_cost": {
      const zoneName = asString(payload.zoneName) ?? asString(payload.name);
      const cost = asNumber(payload.cost);
      if (!zoneName || cost === undefined) {
        throw new Error("update_zone_cost : zone et coût requis.");
      }
      let config = await getDeliveryConfig();
      const zone = config.zones.find((z) =>
        z.name.toLowerCase().includes(zoneName.toLowerCase()),
      );
      if (!zone) throw new Error(`Zone introuvable : ${zoneName}`);
      config = updateZone(config, zone.id, { cost });
      await saveDeliveryConfig(config);
      break;
    }
    case "update_schedule": {
      const dayKey = asString(payload.day)?.toLowerCase();
      const dayNum =
        asNumber(payload.dayOfWeek) ??
        (dayKey ? DAY_MAP[dayKey] : undefined);
      const type = asString(payload.type) ?? "delivery";
      if (dayNum === undefined) {
        throw new Error("update_schedule : jour requis.");
      }
      const config = await getDeliveryConfig();
      const schedules = config.schedules.map((schedule) => {
        if (schedule.type !== type || schedule.dayOfWeek !== dayNum) {
          return schedule;
        }
        return {
          ...schedule,
          startTime: asString(payload.startTime) ?? schedule.startTime,
          endTime: asString(payload.endTime) ?? schedule.endTime,
          slotDuration:
            asNumber(payload.slotDuration) ?? schedule.slotDuration,
          isActive:
            typeof payload.isActive === "boolean"
              ? payload.isActive
              : schedule.isActive,
        };
      });
      await saveDeliveryConfig({ ...config, schedules });
      break;
    }
    default:
      throw new Error(`Action non supportée : ${action}`);
  }

  await appendAdminActionLog({
    adminName,
    source: "ai_assistant",
    action,
    summary: message,
    details: { payload },
  });

  return { ok: true, message };
}
