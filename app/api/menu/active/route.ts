import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import {
  activateDueMenus,
  getActiveMenu,
  getNextScheduledMenu,
  getShopProductsFromActiveMenu,
} from "@/lib/server/menu-repository";

const getCachedMenuPayload = unstable_cache(
  async () => {
    // L'activation est un effet de bord : si elle échoue, la boutique doit
    // quand même afficher le menu en cours. C'est le cron qui doit alerter.
    try {
      await activateDueMenus();
    } catch {
      // Déjà journalisé par `activateDueMenus`.
    }

    const [activeMenu, nextMenu, products] = await Promise.all([
      getActiveMenu(),
      getNextScheduledMenu(),
      getShopProductsFromActiveMenu(),
    ]);

    const activateAtLabel = nextMenu
      ? new Date(nextMenu.activateAt).toLocaleString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return { activeMenu, nextMenu, activateAtLabel, products };
  },
  ["menu-active-v1"],
  { revalidate: 60, tags: ["menu"] },
);

export async function GET() {
  const payload = await getCachedMenuPayload();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
