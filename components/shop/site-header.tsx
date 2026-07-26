"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { BrandLogo } from "@/components/shop/brand-logo";
import { CartIconButton } from "@/components/shop/cart-icon-button";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/infos", label: "Infos" },
  { href: "/zones-de-livraison", label: "Livraison" },
] as const;

function linkIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Header fixe clair — même rendu partout (plus de overlay sombre sur l'accueil). */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-bg/95 backdrop-blur-md supports-[backdrop-filter]:bg-bg/90">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 shrink cursor-pointer items-center"
          aria-label={`${SITE_NAME_WITH_CREDIT} — accueil`}
        >
          <BrandLogo
            compact
            className="transition-opacity duration-200 group-hover:opacity-90"
          />
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Navigation principale"
        >
          {navLinks.map((link) => {
            const active = linkIsActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-2.5 font-body text-sm font-medium transition-colors duration-200",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <CartIconButton />
      </div>
    </header>
  );
}

export function ProductBackLink() {
  return (
    <Link
      href="/catalogue"
      className="mb-6 inline-flex min-h-11 cursor-pointer items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-primary"
    >
      <ChevronLeft className="size-4" aria-hidden />
      Retour au catalogue
    </Link>
  );
}
