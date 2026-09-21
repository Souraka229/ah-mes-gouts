import { getProductPrice, getProductCategory } from "@/lib/catalog-utils";
import { isUnlimitedStockCategory } from "@/lib/admin/categories";
import {
  getNounoursSizeByCm,
  isNounoursProduct,
} from "@/lib/constants/nounours-sizes";
import {
  findVariantByCode,
  getActiveVariantsByProductIds,
} from "@/lib/server/variant-repository";
import {
  getFullCatalog,
  getShopProductsFromActiveMenu,
} from "@/lib/server/shop-catalog";
import { getPrisma } from "@/lib/prisma";
import { supplementOptions } from "@/lib/supplements";
import type { SavedOrder } from "@/types/order";

export type PricingIssue = { name: string; message: string };

export type StockClaim = {
  slug: string;
  name: string;
  quantity: number;
  category?: string;
  unlimitedStock?: boolean;
  /** Variante concernée, le cas échéant. */
  variantId?: string;
  /** La variante porte son propre stock — sinon c'est celui du produit. */
  variantStockTracked?: boolean;
};

export type PricedOrder = {
  /** Articles avec prix unitaires recalculés côté serveur. */
  items: SavedOrder["items"];
  subtotal: number;
  /** Décréments de stock à appliquer atomiquement à la création. */
  stockClaims: StockClaim[];
};

export type RawOrderItem = {
  slug?: string;
  name: string;
  quantity: number;
  supplements: string[];
  /** Code de variante — « 150 », « petit », « 6 ». */
  variantCode?: string;
  /**
   * @deprecated Alias historique du code de variante, conservé le temps que les
   * paniers déjà ouverts se vident. Les nounours utilisent leur taille en cm
   * comme code, la conversion est donc directe.
   */
  sizeCm?: number;
};

/** Prix des suppléments, source de vérité serveur (jamais le client). */
const supplementPriceByName = new Map(
  supplementOptions.map((option) => [option.name, option.price]),
);

/**
 * Code de variante demandé par le client.
 *
 * Le client n'envoie qu'un **identifiant de choix** : jamais un montant, jamais
 * un libellé, jamais un prix. Tout le reste est relu en base.
 */
function resolveVariantCode(raw: RawOrderItem): string | undefined {
  const explicit = raw.variantCode?.trim();
  if (explicit) return explicit.toLowerCase();
  if (raw.sizeCm !== undefined) return String(raw.sizeCm);
  return undefined;
}

/**
 * Recalcule prix unitaires, sous-total et stock à partir du catalogue serveur.
 * Ignore totalement les montants envoyés par le client (anti-fraude).
 * Retourne les problèmes (stock, produit/variante/supplément inconnu) le cas
 * échéant.
 */
export async function priceOrderItems(
  rawItems: RawOrderItem[],
): Promise<
  | { ok: true; data: PricedOrder }
  | { ok: false; issues: PricingIssue[] }
> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      ok: false,
      issues: [{ name: "Panier", message: "Votre panier est vide." }],
    };
  }

  const [catalog, activeMenuProducts] = await Promise.all([
    getFullCatalog(),
    getShopProductsFromActiveMenu(),
  ]);
  const bySlug = new Map(catalog.map((product) => [product.slug, product]));
  const byName = new Map(catalog.map((product) => [product.name, product]));
  const activeMenuSlugs = new Set(
    activeMenuProducts.map((product) => product.slug),
  );

  /**
   * Variantes actives de tout le catalogue, en **une** requête. Le catalogue
   * compte quelques dizaines de produits : sur-lire est moins coûteux qu'une
   * requête par ligne de panier.
   */
  const activeVariants = await getActiveVariantsByProductIds(
    catalog.map((product) => product.id),
  );

  const slugs = rawItems
    .map((item) => item.slug)
    .filter((slug): slug is string => Boolean(slug));

  // Stock live : une panne de base ne doit pas faire échouer la commande en
  // 500. On laisse la carte vide — un produit à stock suivi sera alors refusé
  // plus bas par le contrôle de stock, ce qui est le bon comportement.
  const liveStock = new Map<string, number>();
  if (slugs.length > 0) {
    try {
      const prisma = getPrisma();
      const rows = await prisma.product.findMany({
        where: { slug: { in: slugs } },
        select: { slug: true, stockRemaining: true },
      });
      for (const row of rows) {
        liveStock.set(row.slug, row.stockRemaining);
      }
    } catch {
      // Base injoignable : on continue avec le stock du catalogue.
    }
  }

  const issues: PricingIssue[] = [];
  const items: SavedOrder["items"] = [];
  const stockClaims: StockClaim[] = [];
  let subtotal = 0;

  for (const raw of rawItems) {
    const product =
      (raw.slug ? bySlug.get(raw.slug) : undefined) ?? byName.get(raw.name);

    if (!product) {
      issues.push({
        name: raw.name,
        message: "Ce produit n'est plus disponible.",
      });
      continue;
    }

    const category = getProductCategory(product);
    const unlimitedStock = isUnlimitedStockCategory(category);

    if (!unlimitedStock) {
      if (!activeMenuSlugs.has(product.slug)) {
        issues.push({
          name: product.name,
          message:
            "Ce produit ne fait pas partie du menu disponible aujourd’hui.",
        });
        continue;
      }

      const stockRemaining =
        liveStock.get(product.slug) ?? product.stockRemaining;

      if (
        process.env.NODE_ENV === "production" &&
        !liveStock.has(product.slug)
      ) {
        issues.push({
          name: product.name,
          message: "Ce produit n'est plus disponible.",
        });
        continue;
      }

      if (stockRemaining <= 0) {
        issues.push({
          name: product.name,
          message: "Ce produit vient d'être épuisé.",
        });
        continue;
      }

      if (raw.quantity > stockRemaining) {
        issues.push({
          name: product.name,
          message: `Stock insuffisant (${stockRemaining} restant${
            stockRemaining > 1 ? "s" : ""
          }).`,
        });
        continue;
      }
    }

    /**
     * Produits à variantes : la fiche catalogue ne porte qu'un prix d'entrée,
     * le prix réel vient de la variante choisie. Sans variante active
     * sélectionnée on **refuse** — facturer le prix d'entrée laisserait partir
     * une commande sur une taille que la cliente n'a pas choisie.
     */
    let variantPrice: number | undefined;
    let variantId: string | undefined;
    let variantLabel: string | undefined;
    let variantStockTracked = false;
    let itemName = product.name;

    const variants = activeVariants.get(product.id) ?? [];
    if (variants.length > 0) {
      const code = resolveVariantCode(raw);

      if (!code) {
        issues.push({
          name: product.name,
          message: `Choisissez une option (${product.variantLabel ?? "taille"}).`,
        });
        continue;
      }

      const variant = findVariantByCode(variants, code);
      if (!variant) {
        issues.push({
          name: product.name,
          message: `Option indisponible (${code}).`,
        });
        continue;
      }

      // Stock porté par la variante, quand elle en a un.
      if (variant.stockRemaining !== null) {
        variantStockTracked = true;

        if (variant.stockRemaining <= 0) {
          issues.push({
            name: product.name,
            message: `${variant.label} vient d'être épuisé.`,
          });
          continue;
        }

        if (raw.quantity > variant.stockRemaining) {
          issues.push({
            name: product.name,
            message: `Stock insuffisant pour ${variant.label} (${variant.stockRemaining} restant${
              variant.stockRemaining > 1 ? "s" : ""
            }).`,
          });
          continue;
        }
      }

      variantPrice = variant.price;
      variantId = variant.id;
      variantLabel = variant.label;
      itemName = `${product.name} — ${variant.label}`;
    } else if (isNounoursProduct(product.slug)) {
      /**
       * FILET DE SÉCURITÉ TRANSITOIRE — à supprimer une fois les variantes
       * nounours semées en base.
       *
       * Tant qu'une fiche nounours n'a pas de variante en base, on retombe sur
       * la grille officielle du code. Sans ce repli, la fiche serait facturée
       * au prix d'entrée quel que soit le palier choisi — exactement le bug de
       * facturation corrigé le 15 septembre. Ce repli ne facture **jamais moins
       * cher** qu'un palier réel : il ne peut pas servir à sous-payer.
       */
      const cm = raw.sizeCm;
      const size = cm === undefined ? undefined : getNounoursSizeByCm(cm);

      if (!size) {
        issues.push({
          name: product.name,
          message:
            cm === undefined
              ? "Choisissez une taille."
              : `Taille indisponible (${cm} cm).`,
        });
        continue;
      }

      variantPrice = size.price;
      variantLabel = `${size.cm} cm`;
      itemName = `${product.name} — ${size.cm} cm`;
    }

    let supplementsPrice = 0;
    let supplementInvalid = false;
    for (const supplementName of raw.supplements) {
      const price = supplementPriceByName.get(supplementName);
      if (price === undefined) {
        issues.push({
          name: product.name,
          message: `Supplément indisponible : ${supplementName}.`,
        });
        supplementInvalid = true;
        break;
      }
      supplementsPrice += price;
    }
    if (supplementInvalid) continue;

    const unitPrice =
      (variantPrice ?? getProductPrice(product)) + supplementsPrice;
    subtotal += unitPrice * raw.quantity;

    items.push({
      name: itemName,
      quantity: raw.quantity,
      unitPrice,
      supplements: raw.supplements,
      slug: product.slug,
      variantId,
      variantLabel,
    });
    stockClaims.push({
      slug: product.slug,
      name: itemName,
      quantity: raw.quantity,
      category,
      unlimitedStock,
      variantId,
      variantStockTracked,
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, data: { items, subtotal, stockClaims } };
}
