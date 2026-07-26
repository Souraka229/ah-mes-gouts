import { DeferredShopChrome } from "@/components/shop/deferred-shop-chrome";
import { ShopFooterGate } from "@/components/shop/shop-footer-gate";
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
      <main className="flex-1">{children}</main>
      <ShopFooterGate />
    </div>
  );
}
