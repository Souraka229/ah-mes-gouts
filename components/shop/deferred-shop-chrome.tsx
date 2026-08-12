"use client";

import dynamic from "next/dynamic";

import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";
import { ShopMobileNav } from "@/components/shop/shop-mobile-nav";

const CartDrawer = dynamic(
  () =>
    import("@/components/shop/cart-drawer").then((m) => m.CartDrawer),
  { ssr: false },
);

/** Chrome mobile : drawer panier + navigation basse + installation PWA. */
export function DeferredShopChrome() {
  return (
    <>
      <CartDrawer />
      <ShopMobileNav />
      <PwaRegistrar serviceWorker="/shop-sw.js" scope="/" />
    </>
  );
}
