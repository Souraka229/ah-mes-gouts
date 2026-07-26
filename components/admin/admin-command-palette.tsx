"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  IceCreamCone,
  LayoutDashboard,
  Package,
  Search,
  Truck,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  action?: () => void;
  group: string;
};

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const items: CommandItem[] = useMemo(
    () => [
      {
        id: "dash",
        label: "Tableau de bord",
        href: "/admin/cockpit",
        group: "Navigation",
      },
      {
        id: "orders",
        label: "Commandes du jour",
        href: "/admin/commandes",
        group: "Navigation",
      },
      {
        id: "menus",
        label: "Menus journaliers",
        hint: "Programmer le menu de demain",
        href: "/admin/menus",
        group: "Navigation",
      },
      {
        id: "products",
        label: "Produits",
        href: "/admin/produits",
        group: "Navigation",
      },
      {
        id: "delivery",
        label: "Livraison & créneaux",
        href: "/admin/parametres/livraison",
        group: "Navigation",
      },
      {
        id: "menu-tomorrow",
        label: "Programmer le menu de demain",
        href: "/admin/menus",
        group: "Actions rapides",
      },
      {
        id: "low-stock",
        label: "Voir stock faible",
        href: "/admin/produits",
        group: "Actions rapides",
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint?.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q),
    );
  }, [items, query]);

  const run = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      setQuery("");
      if (item.action) item.action();
      else if (item.href) router.push(item.href);
    },
    [router],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  const iconFor = (id: string) => {
    if (id.includes("order")) return Package;
    if (id.includes("menu")) return Calendar;
    if (id.includes("product") || id.includes("stock")) return IceCreamCone;
    if (id.includes("delivery")) return Truck;
    return LayoutDashboard;
  };

  const groups = [...new Set(filtered.map((i) => i.group))];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[15vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Rechercher une page ou une action…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucun résultat
            </p>
          ) : (
            groups.map((group) => (
              <div key={group} className="mb-2">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group}
                </p>
                {filtered
                  .filter((i) => i.group === group)
                  .map((item) => {
                    const Icon = iconFor(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-bg",
                        )}
                        onClick={() => run(item)}
                      >
                        <Icon className="size-4 text-primary" />
                        <span className="flex-1 font-medium">{item.label}</span>
                        {item.hint && (
                          <span className="text-xs text-muted-foreground">
                            {item.hint}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>
        <p className="border-t border-border px-4 py-2 text-center text-[10px] text-muted-foreground">
          Ctrl+K · Navigation rapide sans formation
        </p>
      </div>
    </div>
  );
}
