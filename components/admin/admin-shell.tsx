"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  Calendar,
  Database,
  IceCreamCone,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
  Package,
  Settings,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import { BrandLogo } from "@/components/shop/brand-logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/commandes", label: "Commandes du jour", icon: Package },
  { href: "/admin/livreurs", label: "Livreurs", icon: UserRound },
  { href: "/admin/menus", label: "Menu du jour", icon: Calendar },
  { href: "/admin/produits", label: "Produits", icon: IceCreamCone },
  {
    href: "/admin/site-builder",
    label: "Éditeur de site",
    icon: LayoutTemplate,
    adminOnly: true,
  },
  {
    href: "/admin/parametres",
    label: "Paramètres",
    icon: Settings,
    adminOnly: true,
  },
  {
    href: "/admin/parametres/livraison",
    label: "Créneaux livraison",
    icon: Truck,
  },
  {
    href: "/admin/assistant",
    label: "Assistant IA",
    icon: Bot,
    adminOnly: true,
  },
  { href: "/admin/donnees", label: "Données", icon: Database },
];

type AdminMe = {
  adminName: string;
  role: string;
  isAdministrator: boolean;
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<AdminMe | null>(null);

  useEffect(() => {
    void fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMe(data as AdminMe | null))
      .catch(() => null);
  }, []);

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || me?.isAdministrator !== false,
  );

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen bg-[#f4f1ee] font-body text-text">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-primary/15 bg-primary text-primary-foreground lg:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <BrandLogo variant="onDark" />
          <p className="mt-2 font-body text-xs text-primary-foreground/70">
            Back-office
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm transition-colors",
                  active
                    ? "bg-white/15 font-medium"
                    : "text-primary-foreground/80 hover:bg-white/10",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 font-body text-xs text-primary-foreground/60">
          Plateforme admin — distincte du site client
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-primary text-primary-foreground shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <p className="font-display font-semibold">Back-office</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1 hover:bg-white/10"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <nav className="space-y-1 p-3">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/10"
                  >
                    <Icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hidden cursor-pointer items-center gap-2 rounded-lg border border-border px-2 py-1.5 font-body text-xs text-muted-foreground hover:bg-bg sm:flex"
              onClick={() =>
                window.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "k",
                    ctrlKey: true,
                  }),
                )
              }
              title="Recherche rapide"
            >
              <span>Rechercher</span>
              <kbd className="rounded border border-border px-1 font-mono text-[10px]">
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              className="rounded-lg border border-border p-2 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <div className="flex items-center gap-2">
              <p className="font-body text-xs font-medium tracking-widest text-muted-foreground uppercase">
                Administration
              </p>
              <BrandLogo variant="onDark" compact className="lg:hidden" />
            </div>
          </div>
          <div className="text-right font-body text-xs text-muted-foreground">
            <p className="font-medium text-text">
              {me?.adminName ?? "…"}
            </p>
            <p className="capitalize">{me?.role ?? "chargement"}</p>
            <button
              type="button"
              className="mt-1 cursor-pointer text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
              onClick={() => {
                void fetch("/api/admin/auth", { method: "DELETE" }).then(() => {
                  window.location.href = "/";
                });
              }}
            >
              Déconnexion
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
