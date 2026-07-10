import { PRODUCT_CATEGORIES } from "@/lib/admin/categories";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import type { AdminCatalogProduct } from "@/lib/server/admin-catalog-repository";
import type { DeliveryZoneConfig } from "@/lib/delivery/types";

const PRODUCT_KEYWORDS =
  /produit|prix|stock|glace|entremet|promo|promotion|carte|cadeau|nouveau|ajoute|ajouter|modifier|change/i;

function formatProductLine(product: AdminCatalogProduct): string {
  return `- ${product.name} : ${product.price} FCFA, stock ${product.stockRemaining}, catégorie ${product.category}`;
}

function formatZoneLine(zone: DeliveryZoneConfig): string {
  return `- ${zone.name} : ${zone.cost} FCFA, ${zone.isActive ? "active" : "inactive"}`;
}

export function shouldIncludeProducts(userInput: string): boolean {
  return PRODUCT_KEYWORDS.test(userInput);
}

export function buildAssistantPrompt({
  userInput,
  zones,
  products,
}: {
  userInput: string;
  zones: DeliveryZoneConfig[];
  products: AdminCatalogProduct[];
}): string {
  const categories = PRODUCT_CATEGORIES.join(", ");
  const zonesBlock =
    zones.length > 0
      ? zones.map(formatZoneLine).join("\n")
      : "(aucune zone configurée)";

  const productsBlock = shouldIncludeProducts(userInput)
    ? products.map(formatProductLine).join("\n") || "(aucun produit)"
    : "(non inclus — l'action ne semble pas concerner un produit existant)";

  return `Tu es un assistant qui aide à structurer une action d'administration pour le back-office du site "${SITE_NAME_WITH_CREDIT}" (glacier). Voici le contexte actuel pertinent :

CATÉGORIES EXISTANTES : ${categories}
ZONES DE LIVRAISON EXISTANTES :
${zonesBlock}
PRODUITS EXISTANTS :
${productsBlock}

Voici ce que l'admin veut faire : "${userInput.trim()}"

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, dans exactement ce format :

{
  "action": "create_product" | "update_product" | "update_stock" | "toggle_zone" | "update_zone_cost" | "update_schedule" | "create_promo" | "unknown",
  "payload": { ... champs spécifiques à l'action ... },
  "summary": "une phrase claire en français décrivant ce qui va changer",
  "confidence": "high" | "medium" | "low"
}

Si l'action demandée est ambiguë ou ne correspond à aucun type d'action connu, réponds avec "action": "unknown" et explique pourquoi dans "summary".
Ne réponds qu'avec le JSON, rien d'autre.`;
}
