"use client";

import dynamic from "next/dynamic";

const CartDrawer = dynamic(
  () =>
    import("@/components/shop/cart-drawer").then((m) => m.CartDrawer),
  { ssr: false },
);

const StickyCartBar = dynamic(
  () =>
    import("@/components/shop/sticky-cart-bar").then(
      (m) => m.StickyCartBar,
    ),
  { ssr: false },
);

/** Chrome non critique : drawer + bandeau mobile après le paint initial. */
export function DeferredShopChrome() {
  return (
    <>
      <CartDrawer />
      <StickyCartBar />
    </>
  );
}
