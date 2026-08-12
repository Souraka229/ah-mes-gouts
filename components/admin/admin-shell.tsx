"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Calendar,
  ChevronDown,
  IceCreamCone,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { BrandLogo } from "@/components/shop/brand-logo";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Package;
  adminOnly?: boolean;
  /** Rangé sous « Plus » — accessible mais masqué par défaut. */
  secondary?: boolean;
};

// L'essentiel au quotidien — 4 écrans du plan de cadrage.
const NAV_ITEMS: NavItem[] = [
  { href: "/admin/commandes", label: "Commandes", icon: Package },
  { href: "/admin/produits", label: "Produits", icon: IceCreamCone },
  { href: "/admin/menus", label: "Menu du jour", icon: Calendar },
  {
    href: "/admin/parametres/livraison",
    label: "Livraison",
    icon: Truck,
  },
  { href: "/admin/livreurs", label: "Livreurs", icon: UserRound, secondary: true },
  {
    href: "/admin/cockpit",
    label: "Cockpit",
    icon: LayoutDashboard,
    secondary: true,
  },
  { href: "/admin/clients", label: "Clients", icon: Users, secondary: true },
  {
    href: "/admin/parametres",
    label: "Paramètres",
    icon: Settings,
    adminOnly: true,
    secondary: true,
  },
];

type AdminMe = {
  adminName: string;
  role: string;
  isAdministrator: boolean;
} | null;

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm transition-colors duration-150",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active
          ? "bg-white/15 font-semibold text-white"
          : "text-primary-foreground/70 hover:bg-white/[0.08] hover:text-white",
      )}
    >
      {active && (
        <span
          className="absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 rounded-full bg-accent"
          aria-hidden
        />
      )}
      <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
      {item.label}
    </Link>
  );
}

function NavSection({
  primary,
  secondary,
  expanded,
  onToggleMore,
  isActive,
  onNavigate,
}: {
  primary: NavItem[];
  secondary: NavItem[];
  expanded: boolean;
  onToggleMore: () => void;
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {primary.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(item.href)}
          onNavigate={onNavigate}
        />
      ))}

      {secondary.length > 0 && (
        <>
          <button
            type="button"
            onClick={onToggleMore}
            aria-expanded={expanded}
            className="relative flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm text-primary-foreground/70 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronDown
              className={cn(
                "size-4 shrink-0 opacity-90 transition-transform duration-200",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
            Plus
          </button>
          {expanded &&
            secondary.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                onNavigate={onNavigate}
              />
            ))}
        </>
      )}
    </>
  );
}

export function AdminShell({
  children,
  me,
}: {
  children: React.ReactNode;
  me: AdminMe;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || me?.isAdministrator !== false,
  );

  const isActive = (href: string) => {
    if (href === "/admin/parametres") {
      return (
        pathname.startsWith("/admin/parametres") &&
        !pathname.startsWith("/admin/parametres/livraison")
      );
    }
    return pathname.startsWith(href);
  };

  const primaryNav = visibleNav.filter((item) => !item.secondary);
  const secondaryNav = visibleNav.filter((item) => item.secondary);
  // On déplie « Plus » d'office quand on est déjà sur une page secondaire.
  const onSecondaryPage = secondaryNav.some((item) => isActive(item.href));
  const moreExpanded = showMore || onSecondaryPage;

  const logout = () => {
    void fetch("/api/admin/auth", { method: "DELETE" }).then(() => {
      window.location.href = "/";
    });
  };

  const roleLabel =
    me?.role === "administrateur"
      ? "Administrateur"
      : me?.role === "employe"
        ? "Employé"
        : "…";

  return (
    <div className="flex min-h-screen bg-bg font-body text-text">
      <aside className="hidden w-[248px] shrink-0 flex-col bg-primary text-primary-foreground lg:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <BrandLogo variant="onDark" />
          <p className="mt-3 font-body text-[10px] font-semibold tracking-[0.28em] text-primary-foreground/50 uppercase">
            Back-office
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 p-3" aria-label="Navigation admin">
          <NavSection
            primary={primaryNav}
            secondary={secondaryNav}
            expanded={moreExpanded}
            onToggleMore={() => setShowMore((v) => !v)}
            isActive={isActive}
          />
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          <div>
            <p className="font-body text-sm font-medium text-white">
              {me?.adminName ?? "…"}
            </p>
            <p className="mt-1 inline-flex rounded-full bg-white/10 px-2 py-0.5 font-body text-[10px] font-semibold tracking-wide text-primary-foreground/80 uppercase">
              {roleLabel}
            </p>
          </div>
          <PwaInstallButton
            label="Installer"
            className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          />
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 font-body text-xs text-primary-foreground/65 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-3.5" aria-hidden />
            Déconnexion
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[280px] flex-col bg-primary text-primary-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <p className="font-display text-lg font-semibold">Cockpit</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 hover:bg-white/10"
                aria-label="Fermer"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 p-3">
              <NavSection
                primary={primaryNav}
                secondary={secondaryNav}
                expanded={moreExpanded}
                onToggleMore={() => setShowMore((v) => !v)}
                isActive={isActive}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>
            <div className="space-y-3 border-t border-white/10 p-4">
              <PwaInstallButton
                label="Installer"
                className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              />
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-10 items-center gap-2 text-sm text-primary-foreground/80"
              >
                <LogOut className="size-4" aria-hidden />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/70 bg-bg/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-xl border border-border bg-white p-2.5 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <div>
              <p className="font-body text-[10px] font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                Régie
              </p>
              <p className="font-display text-base font-semibold text-primary lg:hidden">
                {me?.adminName ?? "…"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PwaInstallButton label="Installer" className="hidden sm:inline-flex" />
            <BrandLogo compact className="lg:hidden" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
