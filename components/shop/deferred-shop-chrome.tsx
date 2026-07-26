"use client";

import dynamic from "next/dynamic";

import { ShopMobileNav } from "@/components/shop/shop-mobile-nav";

const CartDrawer = dynamic(
  () =>
    import("@/components/shop/cart-drawer").then((m) => m.CartDrawer),
  { ssr: false },
);

/** Chrome mobile : drawer panier + barre de navigation basse. */
export function DeferredShopChrome() {
  return (
    <>
      <CartDrawer />
      <ShopMobileNav />
    </>
  );
}
