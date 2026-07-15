"use client";

import { usePathname } from "next/navigation";

import { CartDrawer } from "@/components/shop/cart-drawer";
import { CustomCursorGate } from "@/components/shop/custom-cursor-gate";
import { SiteFooter } from "@/components/shop/site-footer";
import { SiteHeader } from "@/components/shop/site-header";
import { VisitBeacon } from "@/components/shop/visit-beacon";

type ShopChromeProps = {
  children: React.ReactNode;
};

export function ShopChrome({ children }: ShopChromeProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <VisitBeacon />
      <CustomCursorGate />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      {!isHome && <SiteFooter />}
      <CartDrawer />
    </div>
  );
}
