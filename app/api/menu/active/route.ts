import { NextResponse } from "next/server";

import {
  activateDueMenus,
  getActiveMenu,
  getNextScheduledMenu,
  getShopProductsFromActiveMenu,
} from "@/lib/server/menu-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  await activateDueMenus();

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

  return NextResponse.json(
    {
      activeMenu,
      nextMenu,
      activateAtLabel,
      products,
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
