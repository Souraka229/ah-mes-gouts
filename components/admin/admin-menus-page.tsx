"use client";

import {
  addShopDays,
  NEXT_DAY_ORDERING_OPENS_AT,
  shopDateTimeToIso,
} from "@/lib/business-date";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import {
  MenuProductEditor,
  type MenuProductDraft,
} from "@/components/admin/menu-product-editor";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MENU_STATUS_LABELS, type MenuStatus, type ScheduledMenu } from "@/types/menu";
import { cn } from "@/lib/utils";

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Ouverture d'un menu : à l'heure choisie (20 h par défaut) LA VEILLE du jour
 * servi, en heure boutique.
 *
 * Avant, l'ouverture était posée le jour même du menu : un menu du 12 août
 * s'ouvrait le 12 à 20 h, soit une heure après la fermeture de la boutique.
 * Résultat en base : des menus qui n'étaient jamais réellement vendables.
 * `setHours` utilisait en plus le fuseau du navigateur, pas celui de la
 * boutique.
 */
function defaultActivateAtISO(
  menuDateKey: string,
  hour = NEXT_DAY_ORDERING_OPENS_AT,
  minute = 0,
): string {
  const eve = addShopDays(menuDateKey, -1);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return shopDateTimeToIso(eve, `${hh}:${mm}`);
}

export function AdminMenusPage() {
  const [menus, setMenus] = useState<ScheduledMenu[]>([]);
  const [catalog, setCatalog] = useState<MenuProductDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [viewMonth, setViewMonth] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledMenu | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [productDrafts, setProductDrafts] = useState<Record<string, MenuProductDraft>>({});
  const [targetDate, setTargetDate] = useState("");
  const [activateTime, setActivateTime] = useState("20:00");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [menusRes, productsRes] = await Promise.all([
        fetch("/api/admin/menus", { cache: "no-store" }),
        fetch("/api/admin/products", { cache: "no-store" }),
      ]);
      if (menusRes.ok) {
        const data = (await menusRes.json()) as { menus: ScheduledMenu[] };
        setMenus(data.menus);
      }
      if (productsRes.ok) {
        const data = (await productsRes.json()) as {
          products: MenuProductDraft[];
        };
        const filtered = (data.products ?? []).filter(
          (p) => p.slug !== "carte-cadeau" && !p.slug.includes("nounours"),
        );
        setCatalog(filtered);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const initDrafts = useCallback(
    (ids: string[]) => {
      const drafts: Record<string, MenuProductDraft> = {};
      for (const id of ids) {
        const product = catalog.find((p) => p.id === id);
        if (product) drafts[id] = { ...product };
      }
      setProductDrafts(drafts);
    },
    [catalog],
  );

  const days = useMemo(() => {
    const count = viewMonth ? 28 : 7;
    return Array.from({ length: count }, (_, i) => addDays(weekStart, i));
  }, [weekStart, viewMonth]);

  const menusByDay = useMemo(() => {
    const map = new Map<string, ScheduledMenu[]>();
    for (const menu of menus) {
      const key = new Date(menu.date).toDateString();
      const list = map.get(key) ?? [];
      list.push(menu);
      map.set(key, list);
    }
    return map;
  }, [menus]);

  const openCreateTomorrow = () => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(0, 0, 0, 0);
    const active = menus.find((m) => m.status === "active");
    const yesterday = menus
      .filter((m) => m.status !== "scheduled")
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0];

    const source = active ?? yesterday;
    const ids = source
      ? [...source.productIds]
      : catalog.slice(0, 6).map((p) => p.id);
    setEditing(null);
    setTargetDate(toDateInput(tomorrow));
    setActivateTime("20:00");
    setSelectedIds(ids);
    initDrafts(ids);
    setFormOpen(true);
  };

  const openEdit = (menu: ScheduledMenu) => {
    if (menu.status === "active") {
      const ok = window.confirm(
        "Ce menu est déjà actif. Modifier quand même ? Les clients voient ces produits en direct.",
      );
      if (!ok) return;
    }
    setEditing(menu);
    setTargetDate(toDateInput(new Date(menu.date)));
    const at = new Date(menu.activateAt);
    setActivateTime(
      `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`,
    );
    const ids = [...menu.productIds];
    setSelectedIds(ids);
    initDrafts(ids);
    setFormOpen(true);
  };

  const moveProduct = (index: number, dir: -1 | 1) => {
    const next = [...selectedIds];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setSelectedIds(next);
  };

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (!prev.includes(id)) {
        const product = catalog.find((p) => p.id === id);
        if (product) {
          setProductDrafts((d) => ({ ...d, [id]: { ...product } }));
        }
      } else {
        setProductDrafts((d) => {
          const copy = { ...d };
          delete copy[id];
          return copy;
        });
      }
      return next;
    });
  };

  const updateProductDraft = (id: string, patch: Partial<MenuProductDraft>) => {
    setProductDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id]!, ...patch },
    }));
  };

  const saveDirtyProducts = async () => {
    const dirty = selectedIds
      .map((id) => productDrafts[id])
      .filter((p): p is MenuProductDraft => Boolean(p?.dirty));

    for (const product of dirty) {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          description: product.description,
          keyword: product.keyword ?? "",
          stockRemaining: product.stockRemaining,
          stockMinimum: product.stockMinimum,
          imageUrl: product.imageUrl,
          imageUrls: product.imageUrls,
          isPromotion: product.isPromotion,
          promotionPrice: product.promotionPrice ?? null,
        }),
      });
      if (!res.ok) {
        throw new Error(`Échec mise à jour : ${product.name}`);
      }
    }
  };

  const saveMenu = async (forceActive = false, skipStockWarning = false) => {
    if (!targetDate || selectedIds.length === 0) {
      toast.error("Choisissez une date et au moins un produit.");
      return;
    }

    const [h, m] = activateTime.split(":").map(Number);
    // `targetDate` est déjà une clé calendrier boutique (YYYY-MM-DD).
    // Minuit heure boutique, et non minuit du navigateur : c'est ce décalage
    // qui produisait des dates de menu à 01:00, 12:00 ou 23:00 en base.
    const menuDateIso = shopDateTimeToIso(targetDate, "00:00");
    const activateAt = defaultActivateAtISO(
      targetDate,
      h ?? NEXT_DAY_ORDERING_OPENS_AT,
      m ?? 0,
    );
    const displayOrder = selectedIds.map((_, i) => i);
    // Stock du jour = quantité saisie par produit. À 20h (activation du menu),
    // le stock de chaque produit est remis à cette valeur.
    const dailyStock = selectedIds.map(
      (id) => productDrafts[id]?.stockRemaining ?? 0,
    );

    if (!skipStockWarning && dailyStock.every((qty) => qty <= 0)) {
      const ok = window.confirm(
        "Aucune quantité du jour n'est définie pour ce menu — le stock ne sera pas renouvelé à l'activation, chaque produit gardera son stock actuel. Continuer quand même ?",
      );
      if (!ok) return;
      return saveMenu(forceActive, true);
    }

    setSaving(true);
    try {
      await saveDirtyProducts();

      if (editing) {
        const res = await fetch(`/api/admin/menus/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: menuDateIso,
            activateAt,
            productIds: selectedIds,
            displayOrder,
            dailyStock,
            forceActiveEdit: forceActive || editing.status === "active",
          }),
        });
        if (res.status === 409) {
          const ok = window.confirm(
            "Ce menu est actif. Confirmer la modification ?",
          );
          if (ok) return saveMenu(true, true);
          return;
        }
        if (!res.ok) throw new Error();
        toast.success("Menu et produits mis à jour");
      } else {
        const res = await fetch("/api/admin/menus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: menuDateIso,
            activateAt,
            productIds: selectedIds,
            displayOrder,
            dailyStock,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Menu programmé");
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Enregistrement impossible",
      );
    } finally {
      setSaving(false);
    }
  };

  const duplicateMenu = async (menu: ScheduledMenu) => {
    const tomorrow = addDays(new Date(menu.date), 1);
    const res = await fetch("/api/admin/menus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duplicateFromId: menu.id,
        date: tomorrow.toISOString(),
      }),
    });
    if (res.ok) {
      toast.success("Menu dupliqué pour le lendemain");
      await load();
    } else {
      toast.error("Duplication impossible");
    }
  };

  const statusColor = (status: MenuStatus) => {
    if (status === "active") return "bg-emerald-100 text-emerald-800";
    if (status === "scheduled") return "bg-amber-100 text-amber-900";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">
            Menus journaliers
          </h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Images (jusqu&apos;à 3), prix et tags par produit — tout est
            enregistré en base Postgres.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="cursor-pointer gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={openCreateTomorrow}
        >
          <Calendar className="size-5" aria-hidden />
          Programmer le menu de demain
        </Button>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-border p-2 hover:bg-bg"
              onClick={() =>
                setWeekStart((w) => addDays(w, viewMonth ? -28 : -7))
              }
              aria-label="Période précédente"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-border p-2 hover:bg-bg"
              onClick={() =>
                setWeekStart((w) => addDays(w, viewMonth ? 28 : 7))
              }
              aria-label="Période suivante"
            >
              <ChevronRight className="size-4" />
            </button>
            <p className="font-display font-semibold text-primary">
              {weekStart.toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-full border border-border px-3 py-1 font-body text-xs font-medium hover:bg-bg"
            onClick={() => setViewMonth((v) => !v)}
          >
            {viewMonth ? "Vue semaine" : "Vue mois"}
          </button>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Chargement…
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {days.map((day) => {
              const key = day.toDateString();
              const dayMenus = menusByDay.get(key) ?? [];
              const isToday = sameDay(day, new Date());

              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[120px] rounded-xl border p-3",
                    isToday ? "border-primary/40 bg-primary/5" : "border-border bg-bg",
                  )}
                >
                  <p className="font-body text-xs font-semibold uppercase text-muted-foreground">
                    {day.toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </p>
                  {dayMenus.length === 0 ? (
                    <p className="mt-3 font-body text-xs text-muted-foreground">
                      Aucun menu
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {dayMenus.map((menu) => (
                        <li key={menu.id}>
                          <button
                            type="button"
                            onClick={() => openEdit(menu)}
                            className="w-full cursor-pointer rounded-lg border border-border bg-white p-2 text-left text-xs hover:border-primary/30"
                          >
                            <span
                              className={cn(
                                "inline-block rounded-full px-2 py-0.5 font-semibold",
                                statusColor(menu.status),
                              )}
                            >
                              {MENU_STATUS_LABELS[menu.status]}
                            </span>
                            <p className="mt-1 text-muted-foreground">
                              {new Date(menu.activateAt).toLocaleTimeString(
                                "fr-FR",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                              {" · "}
                              {menu.productIds.length} produit
                              {menu.productIds.length > 1 ? "s" : ""}
                            </p>
                          </button>
                          {menu.status !== "scheduled" && (
                            <button
                              type="button"
                              title="Dupliquer pour le lendemain"
                              className="mt-1 flex cursor-pointer items-center gap-1 font-body text-[10px] text-primary hover:underline"
                              onClick={() => void duplicateMenu(menu)}
                            >
                              <Copy className="size-3" />
                              Dupliquer
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl">
            <h2 className="font-display text-xl font-semibold text-primary">
              {editing ? "Modifier le menu" : "Programmer un menu"}
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="menu-date">Date du menu</Label>
                <Input
                  id="menu-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="menu-time">Heure d&apos;activation</Label>
                <Input
                  id="menu-time"
                  type="time"
                  value={activateTime}
                  onChange={(e) => setActivateTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <p className="mt-6 font-body text-sm font-medium text-text">
              Produits du menu ({selectedIds.length})
            </p>
            <ul className="mt-3 space-y-3">
              {selectedIds.map((id, index) => {
                const draft = productDrafts[id];
                if (!draft) return null;
                return (
                  <li key={id}>
                    <MenuProductEditor
                      product={draft}
                      displayIndex={index}
                      onChange={(patch) => updateProductDraft(id, patch)}
                      onMove={(dir) => moveProduct(index, dir)}
                      canMoveUp={index > 0}
                      canMoveDown={index < selectedIds.length - 1}
                    />
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 font-body text-xs text-muted-foreground">
              Ajouter / retirer du catalogue :
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {catalog.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(p.id)}
                  className={cn(
                    "cursor-pointer rounded-full border px-2 py-1 font-body text-xs",
                    selectedIds.includes(p.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                type="button"
                className="flex-1 cursor-pointer"
                disabled={saving}
                onClick={() => void saveMenu()}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Enregistrer menu + produits"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setFormOpen(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {menus.length === 0 && !loading && (
        <AdminEmptyState
          variant="menus"
          title="Aucun menu programmé"
          description="Commence par demain — un clic suffit pour ouvrir le fournil."
          action={
            <Button
              type="button"
              className="cursor-pointer gap-2"
              onClick={openCreateTomorrow}
            >
              <Plus className="size-4" aria-hidden />
              Programmer le menu de demain
            </Button>
          }
        />
      )}
    </div>
  );
}
