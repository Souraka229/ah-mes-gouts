import { getShopProductsFromActiveMenu } from "@/lib/server/menu-repository";

import { getEffectiveStock } from "@/lib/product-stock-display";

import type { Product } from "@/types/product";

import { joinBlocks } from "./message-compose";
import { catalogUrl } from "./site-links";



export type MenuStockLine = {
  name: string;
  slug: string;
  priceFcfa: number;
  remaining: number | null;
  soldOut: boolean;
  /** Variantes / carte cadeau → personnalisation sur le site uniquement. */
  siteOnly: boolean;
};



export type MenuSnapshot = {

  lines: MenuStockLine[];

  servedDateKey: string | null;

  empty: boolean;

};



const MENU_CACHE_TTL_MS = 45_000;

let menuCache: { at: number; snapshot: MenuSnapshot } | null = null;



async function loadMenuSnapshot(): Promise<MenuSnapshot> {

  const products = await getShopProductsFromActiveMenu();

  if (products.length === 0) {

    return { lines: [], servedDateKey: null, empty: true };

  }



  const lines: MenuStockLine[] = products.map((p: Product) => {

    const remaining = getEffectiveStock(p);

    const soldOut = remaining !== null && remaining <= 0;

    const activeVariants =
      p.variants?.filter((v) => v.isActive && v.stockRemaining !== 0) ?? [];
    const siteOnly =
      Boolean(p.isGiftCard) ||
      activeVariants.length > 0 ||
      (p.category?.toLowerCase().includes("nounours") ?? false);

    return {
      name: p.name,
      slug: p.slug,
      priceFcfa: p.price,
      remaining,
      soldOut,
      siteOnly,
    };

  });



  return {

    lines,

    servedDateKey: new Date().toISOString().slice(0, 10),

    empty: false,

  };

}



/** Menu actif + stock, mis en cache 45 s (webhook / rafales Kapso). */

export async function getMenuSnapshotForBot(): Promise<MenuSnapshot> {

  const now = Date.now();

  if (menuCache && now - menuCache.at < MENU_CACHE_TTL_MS) {

    return menuCache.snapshot;

  }

  const snapshot = await loadMenuSnapshot();

  menuCache = { at: now, snapshot };

  return snapshot;

}



export function menuHintFromSnapshot(snapshot: MenuSnapshot, max = 4): string {

  return snapshot.lines

    .filter((l) => !l.soldOut)

    .slice(0, max)

    .map((l) => l.name)

    .join(" · ");

}



export function formatMenuSnapshotForWhatsApp(snapshot: MenuSnapshot): string {

  if (snapshot.empty) {

    return (

      "Le menu du jour n’est pas encore en ligne. Revenez ce soir après 20 h, " +

      "ou consultez giftentremets.com/catalogue."

    );

  }



  const rows = snapshot.lines.map((l) => {

    if (l.soldOut) return `• ${l.name} — épuisé`;

    if (l.remaining === null) return `• ${l.name} — ${formatFcfa(l.priceFcfa)}`;

    return `• ${l.name} — ${formatFcfa(l.priceFcfa)} (${l.remaining} restant${l.remaining > 1 ? "s" : ""})`;

  });



  return joinBlocks([
    "Menu du jour",
    rows.join("\n"),
    `Catalogue : ${catalogUrl()}`,
    "Écrivez « commander » pour le parcours WhatsApp.",
  ]);

}



function formatFcfa(n: number): string {

  return `${n.toLocaleString("fr-FR")} FCFA`;

}


