import type { AdminActionType } from "@/lib/admin-assistant/types";

export function getFormLinkForAction(action: AdminActionType): string | null {
  switch (action) {
    case "toggle_zone":
    case "update_zone_cost":
    case "update_schedule":
      return "/admin/parametres/livraison";
    case "create_product":
    case "update_product":
    case "update_stock":
    case "create_promo":
      return "/admin/donnees";
    default:
      return "/admin";
  }
}
