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
  { href: "/infos", label: "Infos" },
  { href: "/#contact", label: "Boutique" },
] as const;

const SCROLL_SOLID_THRESHOLD_PX = 72;

function linkIsActive(pathname: string, href: string): boolean {
  if (href.startsWith("/#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const onDark = isHome && !scrolled;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300",
        solidHeader
          ? "border-b border-border/50 bg-bg/90 shadow-[0_1px_16px_rgba(36,23,38,0.06)] backdrop-blur-md"
          : "absolute inset-x-0 top-0 border-b border-white/[0.06] bg-gradient-to-b from-primary/55 via-primary/20 to-transparent",
      )}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 shrink cursor-pointer items-center"
          aria-label={`${SITE_NAME_WITH_CREDIT} — accueil`}
        >
          <BrandLogo
            variant={onDark ? "onDark" : "default"}
            compact={onDark}
            className="transition-opacity duration-200 group-hover:opacity-90"
          />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-6">
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
                    "group relative cursor-pointer rounded-lg px-3 py-2 font-body text-[13px] font-medium tracking-[0.02em] transition-colors duration-200",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                    onDark
                      ? cn(
                          "focus-visible:outline-accent",
                          active ? "text-bg" : "text-bg/70 hover:text-bg",
                        )
                      : cn(
                          "focus-visible:outline-primary",
                          active
                            ? "text-primary"
                            : "text-muted-foreground hover:text-primary",
                        ),
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      "absolute inset-x-3 -bottom-0.5 h-px origin-center transition-transform duration-200",
                      onDark ? "bg-accent" : "bg-primary/50",
                      active
                        ? "scale-x-100"
                        : "scale-x-0 group-hover:scale-x-100",
                    )}
                    aria-hidden
                  />
                </Link>
              );
            })}
          </nav>

          <nav
            className="flex items-center md:hidden"
            aria-label="Navigation mobile"
          >
            {navLinks.slice(0, 2).map((link) => {
              const active = linkIsActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "cursor-pointer rounded-lg px-2.5 py-2 font-body text-xs font-medium tracking-wide transition-colors",
                    onDark
                      ? active
                        ? "text-bg"
                        : "text-bg/75 hover:text-bg"
                      : active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div
            className={cn(
              "mx-1 hidden h-5 w-px shrink-0 md:block",
              onDark ? "bg-white/20" : "bg-border",
            )}
            aria-hidden
          />

          <CartIconButton variant={onDark ? "onDark" : "default"} />
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
