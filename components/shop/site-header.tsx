"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/shop/brand-logo";
import { CartIconButton } from "@/components/shop/cart-drawer";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/zones-de-livraison", label: "Livraison" },
  { href: "/#contact", label: "Contact" },
] as const;

const SCROLL_SOLID_THRESHOLD_PX = 80;

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }

    const onScroll = () => {
      setScrolled(window.scrollY > SCROLL_SOLID_THRESHOLD_PX);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const solidHeader = !isHome || scrolled;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300",
        solidHeader
          ? "border-b border-border/40 bg-[#FAF7F5] shadow-[0_1px_12px_rgba(0,0,0,0.06)]"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex cursor-pointer items-center"
          aria-label={`${SITE_NAME_WITH_CREDIT} — accueil`}
        >
          <BrandLogo priority />
        </Link>

        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Navigation principale"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="cursor-pointer font-body text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <nav
            className="flex items-center gap-3 md:hidden"
            aria-label="Navigation mobile"
          >
            {navLinks.slice(0, 2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="cursor-pointer font-body text-xs font-medium text-muted-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <CartIconButton />
        </div>
      </div>
    </header>
  );
}

export function ProductBackLink() {
  return (
    <Link
      href="/catalogue"
      className="mb-6 inline-flex cursor-pointer items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-primary"
    >
      <ChevronLeft className="size-4" aria-hidden />
      Retour au catalogue
    </Link>
  );
}
