import { ShopChrome } from "@/components/shop/shop-chrome";

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ShopChrome>{children}</ShopChrome>;
}
