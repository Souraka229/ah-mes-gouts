"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  Database,
  IceCreamCone,
  Info,
  ScrollText,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const SETTINGS_NAV = [
  {
    href: "/admin/parametres/boutique",
    label: "Infos boutique",
    icon: Info,
  },
  {
    href: "/admin/parametres/livraison",
    label: "Zones & horaires",
    icon: Truck,
  },
  { href: "/admin/menus", label: "Menus & packs", icon: Calendar },
  {
    href: "/admin/parametres/promotions",
    label: "Promotions",
    icon: Sparkles,
  },
  {
    href: "/admin/parametres/utilisateurs",
    label: "Utilisateurs & rôles",
    icon: Users,
  },
  { href: "/admin/donnees", label: "Données", icon: Database },
  { href: "/admin/parametres/journal", label: "Journal des actions", icon: ScrollText },
  {
    href: "/admin/parametres/notifications",
    label: "Notifications",
    icon: Bell,
  },
  { href: "/admin/produits", label: "Catalogue produits", icon: IceCreamCone },
];

export default function ParametresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <nav className="w-full shrink-0 rounded-2xl border border-border bg-white p-3 lg:w-56">
        <p className="px-2 py-1 font-body text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Paramètres
        </p>
        <ul className="mt-2 space-y-0.5">
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const className = cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 font-body text-sm transition-colors",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-bg hover:text-text",
            );
            if ("external" in item && item.external) {
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </a>
                </li>
              );
            }
            return (
              <li key={item.href}>
                <Link href={item.href} className={className}>
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
