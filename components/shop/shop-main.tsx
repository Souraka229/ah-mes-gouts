"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

function needsMobileNavPadding(pathname: string): boolean {
  if (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/commande") ||
    pathname.startsWith("/suivi") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/livreur")
  ) {
    return false;
  }
  return true;
}

export function ShopMain({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main
      className={cn(
        "flex-1",
        needsMobileNavPadding(pathname) &&
          "pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0",
      )}
    >
      {children}
    </main>
  );
}
