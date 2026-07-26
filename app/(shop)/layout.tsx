import { DeferredShopChrome } from "@/components/shop/deferred-shop-chrome";
import { ShopFooterGate } from "@/components/shop/shop-footer-gate";
import { ShopMain } from "@/components/shop/shop-main";
import { SiteHeader } from "@/components/shop/site-header";

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <DeferredShopChrome />
      <SiteHeader />
      <ShopMain>{children}</ShopMain>
      <ShopFooterGate />
    </div>
  );
}
