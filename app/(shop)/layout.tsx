import { DeferredShopChrome } from "@/components/shop/deferred-shop-chrome";
import { SiteFooter } from "@/components/shop/site-footer";
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
      <SiteFooter />
    </div>
  );
}
