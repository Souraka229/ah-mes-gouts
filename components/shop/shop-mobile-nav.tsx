"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Info, LayoutGrid, ShoppingBag } from "lucide-react";

import { useCartItemCount, useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Accueil", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/catalogue",
    label: "Carte",
    icon: LayoutGrid,
    match: (p: string) => p.startsWith("/catalogue") || p.startsWith("/produit"),
  },
  {
    href: "/infos",
    label: "Infos",
    icon: Info,
    match: (p: string) =>
      p.startsWith("/infos") ||
      p.startsWith("/contact") ||
      p.startsWith("/zones-de-livraison"),
  },
] as const;

function shouldHideNav(pathname: string): boolean {
  return (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/commande") ||
    pathname.startsWith("/suivi") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/livreur")
  );
}

/** Navigation bas d'écran — pouces, zones ≥ 44 px (Android / iOS). */
export function ShopMobileNav() {
  const pathname = usePathname();
  const itemCount = useCartItemCount();
  const openCart = useCartStore((state) => state.openCart);
  const isCartOpen = useCartStore((state) => state.isOpen);

  if (shouldHideNav(pathname) || isCartOpen) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Navigation mobile"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-h-[3.25rem] cursor-pointer flex-col items-center justify-center gap-0.5 px-1 py-2 font-body text-[10px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={openCart}
            className={cn(
              "relative flex min-h-[3.25rem] w-full cursor-pointer flex-col items-center justify-center gap-0.5 px-1 py-2 font-body text-[10px] font-semibold transition-colors",
              isCartOpen ? "text-primary" : "text-muted-foreground",
            )}
            aria-label={`Panier${itemCount > 0 ? `, ${itemCount} articles` : ""}`}
          >
            <ShoppingBag className="size-5" strokeWidth={1.75} />
            Panier
            {itemCount > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-1.25rem)] flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-text">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </button>
        </li>
      </ul>
    </nav>
  );
}
