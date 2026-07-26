"use client";

import { usePathname } from "next/navigation";

import { SiteFooter } from "@/components/shop/site-footer";

/** Footer masqué sur l'accueil (footer wordmark de la landing). */
export function ShopFooterGate() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <SiteFooter />;
}
