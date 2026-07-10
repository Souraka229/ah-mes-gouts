import { formatPrice } from "@/lib/format";
import {
  findCatalogProduct,
} from "@/lib/server/admin-catalog-repository";
import { getDeliveryConfig } from "@/lib/server/delivery-config-repository";
import type {
  ActionPreview,
  AdminActionType,
  ConfidenceLevel,
  ParsedAssistantAction,
} from "@/lib/admin-assistant/types";
import { assertActionAllowed, extractJsonObject } from "@/lib/admin-assistant/extract-json";
import { getFormLinkForAction } from "@/lib/admin-assistant/form-links";

const ALLOWED_ACTIONS: AdminActionType[] = [
  "create_product",
  "update_product",
  "update_stock",
  "toggle_zone",
  "update_zone_cost",
  "update_schedule",
  "create_promo",
  "unknown",
];

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

function parseAction(raw: unknown): ParsedAssistantAction {
  if (!raw || typeof raw !== "object") {
    throw new Error("Structure JSON invalide.");
  }
  const obj = raw as Record<string, unknown>;
  const action = asString(obj.action) ?? "unknown";
  assertActionAllowed(action);

  if (!ALLOWED_ACTIONS.includes(action as AdminActionType)) {
    throw new Error(`Action non autorisée : ${action}`);
  }

  const confidence = asString(obj.confidence) as ConfidenceLevel | undefined;
  const validConfidence =
    confidence === "high" || confidence === "medium" || confidence === "low"
      ? confidence
      : "low";

  return {
    action: action as AdminActionType,
    payload:
      obj.payload && typeof obj.payload === "object"
        ? (obj.payload as Record<string, unknown>)
        : {},
    summary: asString(obj.summary) ?? "Action à valider.",
    confidence: validConfidence,
  };
}

async function buildHumanDetails(
  parsed: ParsedAssistantAction,
): Promise<string[]> {
  const { action, payload } = parsed;
  const lines: string[] = [];

  switch (action) {
    case "create_product": {
      const name = asString(payload.name) ?? "Sans nom";
      const price = asNumber(payload.price);
      const category = asString(payload.category) ?? "Non précisée";
      const supplements = Array.isArray(payload.supplements)
        ? payload.supplements.map(String).join(", ")
        : null;
      lines.push(`🆕 Nouveau produit : ${name}`);
      if (price !== undefined) lines.push(`Prix : ${formatPrice(price)}`);
      lines.push(`Catégorie : ${category}`);
      if (supplements) lines.push(`Suppléments : ${supplements}`);
      break;
    }
    case "update_product": {
      const ref = asString(payload.productRef) ?? asString(payload.name) ?? "";
      const existing = ref ? await findCatalogProduct(ref) : undefined;
      const newPrice = asNumber(payload.price);
      lines.push(`✏️ Modification produit : ${existing?.name ?? (ref || "?")}`);
      if (existing && newPrice !== undefined) {
        lines.push(
          `Prix : ${formatPrice(existing.price)} → ${formatPrice(newPrice)}`,
        );
      } else if (newPrice !== undefined) {
        lines.push(`Nouveau prix : ${formatPrice(newPrice)}`);
      }
      break;
    }
    case "update_stock": {
      const ref = asString(payload.productRef) ?? asString(payload.name) ?? "";
      const newStock = asNumber(payload.stock);
      const existing = ref ? await findCatalogProduct(ref) : undefined;
      lines.push(`📉 Stock : ${existing?.name ?? (ref || "?")}`);
      if (existing && newStock !== undefined) {
        lines.push(`Stock : ${existing.stockRemaining} → ${newStock}`);
      } else if (newStock !== undefined) {
        lines.push(`Nouveau stock : ${newStock}`);
      }
      break;
    }
    case "toggle_zone": {
      const zoneName = asString(payload.zoneName) ?? asString(payload.name) ?? "";
      const { zones } = await getDeliveryConfig();
      const zone = zones.find(
        (z) => z.name.toLowerCase() === zoneName.toLowerCase(),
      );
      const nextActive =
        typeof payload.isActive === "boolean"
          ? payload.isActive
          : zone
            ? !zone.isActive
            : undefined;
      lines.push(`✏️ Zone : ${zone?.name ?? zoneName}`);
      if (zone && nextActive !== undefined) {
        lines.push(
          `Statut : ${zone.isActive ? "Active" : "Inactive"} → ${nextActive ? "Active" : "Inactive"}`,
        );
      }
      break;
    }
    case "update_zone_cost": {
      const zoneName = asString(payload.zoneName) ?? asString(payload.name) ?? "";
      const newCost = asNumber(payload.cost);
      const { zones } = await getDeliveryConfig();
      const zone = zones.find(
        (z) => z.name.toLowerCase().includes(zoneName.toLowerCase()),
      );
      lines.push(`✏️ Coût zone : ${zone?.name ?? zoneName}`);
      if (zone && newCost !== undefined) {
        lines.push(`Coût : ${zone.cost} F → ${newCost} F`);
      } else if (newCost !== undefined) {
        lines.push(`Nouveau coût : ${newCost} FCFA`);
      }
      break;
    }
    case "update_schedule": {
      const day = asString(payload.day) ?? asString(payload.dayOfWeek) ?? "?";
      const type = asString(payload.type) ?? "delivery";
      lines.push(`🕐 Horaires (${type}) — jour ${day}`);
      if (payload.startTime) lines.push(`Début : ${payload.startTime}`);
      if (payload.endTime) lines.push(`Fin : ${payload.endTime}`);
      break;
    }
    case "create_promo": {
      const ref = asString(payload.productRef) ?? asString(payload.name) ?? "";
      const promoPrice = asNumber(payload.promotionPrice);
      const existing = ref ? await findCatalogProduct(ref) : undefined;
      lines.push(`🏷️ Promotion : ${existing?.name ?? (ref || "?")}`);
      if (existing && promoPrice !== undefined) {
        lines.push(
          `Prix : ${formatPrice(existing.price)} → ${formatPrice(promoPrice)} (promo)`,
        );
      }
      break;
    }
    default:
      break;
  }

  return lines;
}

export async function analyzeAssistantResponse(
  pastedText: string,
): Promise<ActionPreview> {
  const raw = extractJsonObject(pastedText);
  const parsed = parseAction(raw);
  const humanDetails = await buildHumanDetails(parsed);
  const humanSummary =
    humanDetails.length > 0 ? humanDetails.join("\n") : parsed.summary;

  const formLink = getFormLinkForAction(parsed.action);
  let canApply = false;
  let blockedReason: string | null = null;

  if (parsed.action === "unknown") {
    blockedReason =
      "Cette action n'est pas assez claire pour être appliquée automatiquement — utilise le formulaire classique.";
  } else if (parsed.confidence === "low") {
    blockedReason =
      "Confiance faible — vérifiez la réponse ou utilisez le formulaire classique.";
  } else {
    canApply = true;
  }

  return {
    parsed,
    humanSummary,
    humanDetails,
    canApply,
    formLink,
    blockedReason,
  };
}
