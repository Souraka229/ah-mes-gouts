"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { CatalogueView } from "@/components/shop/catalogue-view";
import { MenuProductPicker } from "@/components/admin/menu-product-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { safeFetch } from "@/lib/api/safe-fetch";
import {
  addShopDays,
  getShopDateKey,
  shopDateTimeToIso,
  NEXT_DAY_ORDERING_OPENS_AT,
} from "@/lib/business-date";
import { resolveMenuProducts } from "@/lib/studio/resolve-menu-products";
import { isDailyMenuCategory } from "@/lib/admin/categories";
import { MENU_STATUS_LABELS, type ScheduledMenu } from "@/types/menu";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

function defaultActivateAtISO(menuDateKey: string): string {
  const eve = addShopDays(menuDateKey, -1);
  const hh = String(NEXT_DAY_ORDERING_OPENS_AT).padStart(2, "0");
  return shopDateTimeToIso(eve, `${hh}:00`);
}

type MenuDraft = {
  productIds: string[];
  displayOrder: number[];
  label: string;
};

export function AdminStudioPage() {
  const [menus, setMenus] = useState<ScheduledMenu[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MenuDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIds, setPickerIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [menusRes, productsRes] = await Promise.all([
      safeFetch<{ menus: ScheduledMenu[] }>("/api/admin/menus"),
      safeFetch<{ products: Product[] }>("/api/admin/products"),
    ]);
    if (menusRes.ok) {
      setMenus(menusRes.data.menus);
      setSelectedId((prev) => {
        if (prev && menusRes.data.menus.some((m) => m.id === prev)) return prev;
        const scheduled = menusRes.data.menus.find((m) => m.status === "scheduled");
        const active = menusRes.data.menus.find((m) => m.status === "active");
        return scheduled?.id ?? active?.id ?? menusRes.data.menus[0]?.id ?? null;
      });
    }
    if (productsRes.ok) {
      setCatalog(productsRes.data.products.filter((p) => p.visibility !== "draft"));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => menus.find((m) => m.id === selectedId) ?? null,
    [menus, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setDirty(false);
      return;
    }
    setDraft({
      productIds: [...selected.productIds],
      displayOrder: selected.productIds.map((_, i) => selected.displayOrder[i] ?? i),
      label: selected.label?.trim() ?? "",
    });
    setDirty(false);
  }, [selected?.id]);

  const menuProducts = useMemo(() => {
    if (!draft) return [];
    return resolveMenuProducts(
      draft.productIds,
      draft.displayOrder,
      catalog,
    );
  }, [draft, catalog]);

  const pickableCatalog = useMemo(
    () =>
      catalog
        .filter((p) => isDailyMenuCategory(p.category))
        .map((p) => ({ id: p.id, name: p.name, category: p.category })),
    [catalog],
  );

  const applyDraftIds = (ids: string[]) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            productIds: ids,
            displayOrder: ids.map((_, i) => i),
          }
        : prev,
    );
    setDirty(true);
  };

  const saveMenu = async (forceActiveEdit = false) => {
    if (!selected || !draft) return;
    setSaving(true);
    const res = await safeFetch<{ menu: ScheduledMenu }>(
      `/api/admin/menus/${selected.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: draft.productIds,
          displayOrder: draft.displayOrder,
          label: draft.label.trim() || null,
          forceActiveEdit,
        }),
      },
    );
    setSaving(false);
    if (!res.ok) {
      if (res.status === 409) {
        const ok = window.confirm(
          "Ce menu est déjà en ligne. Enregistrer quand même ?",
        );
        if (ok) void saveMenu(true);
        return;
      }
      toast.error("Enregistrement impossible");
      return;
    }
    toast.success("Menu enregistré");
    setMenus((prev) =>
      prev.map((m) => (m.id === res.data.menu.id ? res.data.menu : m)),
    );
    setDirty(false);
  };

  const createBrouillon = async () => {
    const dateKey = addShopDays(getShopDateKey(), 1);
    const res = await safeFetch<{ menu: ScheduledMenu }>("/api/admin/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: shopDateTimeToIso(dateKey, "00:00"),
        activateAt: defaultActivateAtISO(dateKey),
        productIds: [],
        displayOrder: [],
        label: `Brouillon · ${dateKey}`,
      }),
    });
    if (!res.ok) {
      toast.error("Impossible de créer le brouillon");
      return;
    }
    toast.success("Brouillon créé");
    await load();
    setSelectedId(res.data.menu.id);
  };

  const duplicate = async () => {
    if (!selected) return;
    const res = await safeFetch<{ menu: ScheduledMenu }>("/api/admin/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateFromId: selected.id }),
    });
    if (!res.ok) {
      toast.error("Duplication impossible");
      return;
    }
    toast.success("Version dupliquée");
    await load();
    setSelectedId(res.data.menu.id);
  };

  const archive = async () => {
    if (!selected) return;
    if (!window.confirm("Mettre cette version à la corbeille ?")) return;
    const res = await safeFetch(`/api/admin/menus/${selected.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error(
        res.status === 409
          ? "Le menu en ligne ne peut pas être supprimé."
          : "Suppression impossible",
      );
      return;
    }
    toast.success("Version archivée");
    await load();
  };

  const openPicker = () => {
    setPickerIds(draft?.productIds ?? []);
    setPickerOpen(true);
  };

  const confirmPicker = () => {
    applyDraftIds(pickerIds);
    setPickerOpen(false);
  };

  const sortedMenus = useMemo(() => {
    const rank = { scheduled: 0, active: 1, expired: 2 } as const;
    return [...menus].sort((a, b) => {
      const sr = rank[a.status] - rank[b.status];
      if (sr !== 0) return sr;
      return new Date(b.activateAt).getTime() - new Date(a.activateAt).getTime();
    });
  }, [menus]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-border bg-muted/30 lg:w-80 lg:border-r lg:border-b-0">
        <div className="p-4">
          <h1 className="font-display text-xl font-semibold text-primary">
            Studio vitrine
          </h1>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Même écran que vos clientes. Brouillons, ordre, duplication.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" className="cursor-pointer" onClick={() => void createBrouillon()}>
              <Plus className="size-4" />
              Brouillon
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer"
              disabled={!selected}
              onClick={() => void duplicate()}
            >
              <Copy className="size-4" />
              Dupliquer
            </Button>
          </div>
        </div>
        <ul className="max-h-[40vh] overflow-y-auto px-2 pb-4 lg:max-h-[calc(100vh-12rem)]">
          {sortedMenus.map((menu) => {
            const label =
              menu.label?.trim() ||
              new Date(menu.date).toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              });
            return (
              <li key={menu.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(menu.id)}
                  className={cn(
                    "mb-1 w-full cursor-pointer rounded-xl px-3 py-3 text-left transition",
                    selectedId === menu.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="block font-body text-sm font-semibold truncate">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block font-body text-xs",
                      selectedId === menu.id
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground",
                    )}
                  >
                    {MENU_STATUS_LABELS[menu.status]} · {menu.productIds.length}{" "}
                    pièce{menu.productIds.length > 1 ? "s" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-3">
          {draft && selected ? (
            <div className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs">
              <Label htmlFor="studio-label" className="text-xs">
                Nom de la version
              </Label>
              <Input
                id="studio-label"
                value={draft.label}
                onChange={(e) => {
                  setDraft({ ...draft, label: e.target.value });
                  setDirty(true);
                }}
                placeholder="Brouillon vendredi…"
                className="h-9"
              />
            </div>
          ) : null}
          <div className="ml-auto flex flex-wrap gap-2">
            <Link
              href="/catalogue"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 font-body text-sm font-medium hover:bg-muted"
            >
              <ExternalLink className="size-4" />
              Site réel
            </Link>
            <Button
              type="button"
              size="sm"
              className="cursor-pointer"
              disabled={!dirty || saving || !selected}
              onClick={() => void saveMenu()}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer text-destructive"
              disabled={!selected || selected.status === "active"}
              onClick={() => void archive()}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          {selected && draft ? (
            <CatalogueView
              menuProducts={menuProducts}
              allProducts={catalog}
              menuEditor={{
                products: menuProducts,
                onReorder: (orderedIds) => applyDraftIds(orderedIds),
                onRemove: (id) =>
                  applyDraftIds(draft.productIds.filter((x) => x !== id)),
                onRequestAdd: openPicker,
              }}
            />
          ) : (
            <p className="p-8 font-body text-muted-foreground">
              Créez un brouillon pour commencer.
            </p>
          )}
        </div>
      </div>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Ajouter au menu du jour</SheetTitle>
          </SheetHeader>
          <MenuProductPicker
            catalog={pickableCatalog}
            selectedIds={pickerIds}
            onToggle={(id) =>
              setPickerIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              )
            }
          />
          <div className="mt-auto flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setPickerOpen(false)}
            >
              Annuler
            </Button>
            <Button type="button" className="cursor-pointer" onClick={confirmPicker}>
              Valider la sélection
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
