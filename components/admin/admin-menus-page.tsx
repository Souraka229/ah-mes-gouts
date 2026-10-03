"use client";

import {
  addShopDays,
  getShopDateKey,
  getShopMinutes,
  getTomorrowShopDateKey,
  NEXT_DAY_ORDERING_OPENS_AT,
  shopDateTimeToIso,
} from "@/lib/business-date";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import type { AppError } from "@/lib/api/errors";
import { safeFetch } from "@/lib/api/safe-fetch";
import {
  MenuProductEditor,
  type MenuProductDraft,
} from "@/components/admin/menu-product-editor";
import { MenuProductPicker } from "@/components/admin/menu-product-picker";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { MenuPlanSteps } from "@/components/admin/menu-plan-steps";
import { isDailyMenuCategory } from "@/lib/admin/categories";
import { formatPrice } from "@/lib/format";
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

function formatShopDateFr(dateKey: string): string {
  const [year = 2026, month = 1, day = 1] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Heure boutique HH:mm à partir d’un ISO — pas le fuseau du navigateur. */
function shopTimeInput(iso: string): string {
  const minutes = getShopMinutes(iso);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

const DEFAULT_DAILY_QTY = 6;

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
  /** Panne de chargement — distincte d'un planning réellement vide. */
  const [loadError, setLoadError] = useState<AppError | null>(null);
  /** Au moins un chargement réussi : sans lui, un échec initial n'est pas « vide ». */
  const [hasLoaded, setHasLoaded] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [viewMonth, setViewMonth] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledMenu | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [productDrafts, setProductDrafts] = useState<Record<string, MenuProductDraft>>({});
  const [dailyQty, setDailyQty] = useState<Record<string, number>>({});
  const [targetDate, setTargetDate] = useState("");
  const [activateTime, setActivateTime] = useState("20:00");
  const [saving, setSaving] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  /** Réassort rapide du menu actif — id produit → quantité tapée. */
  const [liveStockDrafts, setLiveStockDrafts] = useState<Record<string, string>>(
    {},
  );
  const [liveStockSaving, setLiveStockSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Les deux appels partent ensemble : la grille vient des menus, le
    // formulaire du catalogue. Une panne sur l'un ne doit pas effacer ce que
    // l'autre a ramené.
    const [menusResult, productsResult] = await Promise.all([
      safeFetch<{ menus: ScheduledMenu[] }>("/api/admin/menus", {
        requireJson: true,
      }),
      safeFetch<{ products: MenuProductDraft[] }>("/api/admin/products", {
        requireJson: true,
      }),
    ]);

    if (menusResult.ok) {
      setMenus(menusResult.data?.menus ?? []);
      setHasLoaded(true);
    }
    if (productsResult.ok) {
      setCatalog(
        (productsResult.data?.products ?? []).filter(
          (p) => p.slug !== "carte-cadeau" && p.slug !== "nounours",
        ),
      );
    }

    // La grille est la donnée maîtresse : sans elle, « aucun menu programmé »
    // serait un mensonge. Un catalogue manquant, lui, n'empêche pas
    // d'afficher le planning — on le signale sans vider l'écran.
    setLoadError(
      !menusResult.ok
        ? menusResult.error
        : !productsResult.ok
          ? productsResult.error
          : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!formOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFormOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  const initDrafts = useCallback(
    (ids: string[], qtyById?: Record<string, number>, fallbackQty = 0) => {
      const drafts: Record<string, MenuProductDraft> = {};
      const qty: Record<string, number> = {};
      for (const id of ids) {
        const product = catalog.find((p) => p.id === id);
        if (product) drafts[id] = { ...product };
        const copied = qtyById?.[id];
        qty[id] =
          copied !== undefined && copied > 0 ? copied : fallbackQty;
      }
      setProductDrafts(drafts);
      setDailyQty(qty);
    },
    [catalog],
  );

  const days = useMemo(() => {
    const count = viewMonth ? 28 : 7;
    return Array.from({ length: count }, (_, i) => addDays(weekStart, i));
  }, [weekStart, viewMonth]);

  /** Menu réellement servi aux clientes : actif ET daté d'aujourd'hui. */
  const todayMenu = useMemo(
    () =>
      menus.find(
        (m) =>
          m.status === "active" &&
          getShopDateKey(m.date) === getShopDateKey(),
      ) ?? null,
    [menus],
  );

  const todayMenuProducts = useMemo(() => {
    if (!todayMenu) return [];
    return todayMenu.productIds
      .map((id) => catalog.find((p) => p.id === id))
      .filter((p): p is MenuProductDraft => Boolean(p));
  }, [todayMenu, catalog]);

  useEffect(() => {
    if (!todayMenu) {
      setLiveStockDrafts({});
      return;
    }
    const next: Record<string, string> = {};
    for (const id of todayMenu.productIds) {
      const product = catalog.find((p) => p.id === id);
      if (product) next[id] = String(product.stockRemaining);
    }
    setLiveStockDrafts(next);
  }, [todayMenu, catalog]);

  const saveLiveStock = async (productId: string) => {
    const product = catalog.find((p) => p.id === productId);
    if (!product) return;
    const next = Number(liveStockDrafts[productId]);
    if (!Number.isFinite(next) || next < 0 || !Number.isInteger(next)) {
      toast.error("Stock invalide");
      setLiveStockDrafts((prev) => ({
        ...prev,
        [productId]: String(product.stockRemaining),
      }));
      return;
    }
    if (next === product.stockRemaining) return;

    setLiveStockSaving(productId);
    try {
      const result = await safeFetch<{ product?: MenuProductDraft }>(
        `/api/admin/products/${productId}`,
        {
          method: "PATCH",
          json: { stockRemaining: next },
          requireJson: true,
        },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        setLiveStockDrafts((prev) => ({
          ...prev,
          [productId]: String(product.stockRemaining),
        }));
        return;
      }
      setCatalog((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, stockRemaining: next } : p,
        ),
      );
      toast.success(
        next === 0
          ? `${product.name} → épuisé`
          : `${product.name} → ${next} restant${next > 1 ? "s" : ""}`,
      );
    } finally {
      setLiveStockSaving(null);
    }
  };

  const menusByDay = useMemo(() => {
    const map = new Map<string, ScheduledMenu[]>();
    for (const menu of menus) {
      const key = getShopDateKey(menu.date);
      const list = map.get(key) ?? [];
      list.push(menu);
      map.set(key, list);
    }
    return map;
  }, [menus]);

  const openCreateTomorrow = () => {
    const tomorrow = getTomorrowShopDateKey();
    const active = menus.find((m) => m.status === "active");
    const yesterday = menus
      .filter((m) => m.status !== "scheduled")
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0];

    const source = active ?? yesterday;
    const sourceIds = source ? [...source.productIds] : [];
    const ids = sourceIds.filter((id) => {
      const product = catalog.find((p) => p.id === id);
      return product ? isDailyMenuCategory(product.category) : true;
    });
    const qtyById: Record<string, number> = {};
    if (source) {
      source.productIds.forEach((id, index) => {
        qtyById[id] = source.dailyStock[index] ?? 0;
      });
    }
    setEditing(null);
    setTargetDate(tomorrow);
    setActivateTime("20:00");
    setSelectedIds(ids);
    initDrafts(ids, qtyById, DEFAULT_DAILY_QTY);
    setWizardStep(1);
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
    setTargetDate(getShopDateKey(menu.date));
    setActivateTime(shopTimeInput(menu.activateAt));
    const ids = [...menu.productIds];
    const qtyById: Record<string, number> = {};
    ids.forEach((id, index) => {
      qtyById[id] = menu.dailyStock[index] ?? 0;
    });
    setSelectedIds(ids);
    initDrafts(ids, qtyById);
    setWizardStep(1);
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
          setDailyQty((q) => ({
            ...q,
            [id]: DEFAULT_DAILY_QTY,
          }));
        }
      } else {
        setProductDrafts((d) => {
          const copy = { ...d };
          delete copy[id];
          return copy;
        });
        setDailyQty((q) => {
          const copy = { ...q };
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
      const result = await safeFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        json: {
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
        },
      });
      if (!result.ok) {
        // On interrompt tout : publier le menu avec des produits restés à
        // l'ancien prix ferait vendre au mauvais tarif.
        throw new Error(result.error.message);
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
    const dailyStock = selectedIds.map((id) => dailyQty[id] ?? 0);

    if (!skipStockWarning && dailyStock.some((qty) => qty <= 0)) {
      toast.error("Précisez une quantité du jour pour chaque pièce.");
      setWizardStep(2);
      return;
    }

    setSaving(true);
    try {
      await saveDirtyProducts();

      if (editing) {
        const result = await safeFetch(`/api/admin/menus/${editing.id}`, {
          method: "PATCH",
          json: {
            date: menuDateIso,
            activateAt,
            productIds: selectedIds,
            displayOrder,
            dailyStock,
            forceActiveEdit: forceActive || editing.status === "active",
          },
        });
        // 409 = le serveur signale un menu déjà actif : on demande confirmation
        // avant de repasser la requête en forçant.
        if (!result.ok && result.status === 409) {
          const ok = window.confirm(
            "Ce menu est actif. Confirmer la modification ?",
          );
          if (ok) return saveMenu(true, true);
          return;
        }
        if (!result.ok) throw new Error(result.error.message);
        toast.success("Menu mis à jour");
      } else {
        const result = await safeFetch("/api/admin/menus", {
          method: "POST",
          json: {
            date: menuDateIso,
            activateAt,
            productIds: selectedIds,
            displayOrder,
            dailyStock,
          },
        });
        if (!result.ok) throw new Error(result.error.message);
        toast.success("Menu de demain programmé");
      }
      setFormOpen(false);
      setWizardStep(1);
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
    const nextDay = addShopDays(getShopDateKey(menu.date), 1);
    const result = await safeFetch("/api/admin/menus", {
      method: "POST",
      json: {
        duplicateFromId: menu.id,
        date: shopDateTimeToIso(nextDay, "00:00"),
      },
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Menu dupliqué pour le lendemain");
    await load();
  };

  const statusColor = (status: MenuStatus) => {
    if (status === "active") return "bg-emerald-100 text-emerald-800";
    if (status === "scheduled") return "bg-amber-100 text-amber-900";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* État réel côté boutique. Un menu « publié » dont la date est passée
          n'affiche plus aucun produit aux clientes : le back-office doit dire
          ce que la cliente voit, pas ce qui a été saisi.
          Affiché seulement après un premier chargement réussi : sans données,
          « aucun menu publié » serait une affirmation en l'air. */}
      {hasLoaded && (
        <div
          className={
            todayMenu
              ? "rounded-2xl border border-success/40 bg-success/10 px-5 py-4"
              : "rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4"
          }
        >
          {todayMenu ? (
            <p className="font-body text-sm text-primary">
              <span className="font-semibold">Menu du jour en ligne</span> —{" "}
              {todayMenu.productIds.length} produit
              {todayMenu.productIds.length > 1 ? "s" : ""} commandable
              {todayMenu.productIds.length > 1 ? "s" : ""} par les clientes.
            </p>
          ) : (
            <p className="font-body text-sm text-primary">
              <span className="font-semibold">
                Aucun menu publié pour aujourd&apos;hui.
              </span>{" "}
              Les clientes ne peuvent commander aucun entremets. Programmez le
              menu du jour pour rouvrir les ventes.
            </p>
          )}
        </div>
      )}

      {todayMenu && todayMenuProducts.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl font-semibold text-primary">
            Stock du jour
          </h2>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Changez une quantité et validez — la vitrine se met à jour tout de
            suite. Pas besoin de rouvrir le menu.
          </p>
          <ul className="mt-4 divide-y divide-border/70 rounded-xl border border-border">
            {todayMenuProducts.map((product) => (
              <li
                key={product.id}
                className="flex flex-wrap items-center gap-3 px-3 py-2.5"
              >
                <p className="min-w-0 flex-1 font-body text-sm font-medium text-text">
                  {product.name}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    className="w-20 text-right tabular-nums"
                    aria-label={`Stock de ${product.name}`}
                    value={liveStockDrafts[product.id] ?? ""}
                    onChange={(e) =>
                      setLiveStockDrafts((prev) => ({
                        ...prev,
                        [product.id]: e.target.value,
                      }))
                    }
                    onBlur={() => void saveLiveStock(product.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    disabled={liveStockSaving === product.id}
                  />
                  <button
                    type="button"
                    title="Mettre à 0"
                    className="min-h-10 cursor-pointer rounded-full px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    disabled={liveStockSaving !== null}
                    onClick={() => {
                      setLiveStockDrafts((prev) => ({
                        ...prev,
                        [product.id]: "0",
                      }));
                      void (async () => {
                        setLiveStockSaving(product.id);
                        try {
                          const result = await safeFetch(
                            `/api/admin/products/${product.id}`,
                            {
                              method: "PATCH",
                              json: { stockRemaining: 0 },
                              requireJson: true,
                            },
                          );
                          if (!result.ok) {
                            toast.error(result.error.message);
                            return;
                          }
                          setCatalog((prev) =>
                            prev.map((p) =>
                              p.id === product.id
                                ? { ...p, stockRemaining: 0 }
                                : p,
                            ),
                          );
                          toast.success(`${product.name} → épuisé`);
                        } finally {
                          setLiveStockSaving(null);
                        }
                      })();
                    }}
                  >
                    {liveStockSaving === product.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      "86"
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">
            Menu du jour
          </h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Composez les entremets du jour, fixez les quantités, publiez. Les
            fiches (photos, prix) se règlent dans Produits.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="cursor-pointer gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={openCreateTomorrow}
        >
          <Calendar className="size-5" aria-hidden />
          Menu de demain
        </Button>
      </header>

      {/* Panne survenue alors que le planning était déjà affiché : on garde les
          menus connus et on prévient, plutôt que de tout effacer. */}
      {loadError && hasLoaded && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3"
        >
          <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
          <p className="font-body text-sm text-destructive">
            {loadError.message} L&apos;affichage peut être périmé.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => void load()}
          >
            Réessayer
          </Button>
        </div>
      )}

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

        {loading && !hasLoaded ? (
          <div className="mt-8 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
            <span className="font-body text-sm font-medium text-primary">
              Chargement des menus…
            </span>
          </div>
        ) : loadError && !hasLoaded ? (
          /* Premier chargement en échec : « aucun menu programmé » serait un
             mensonge — on ne sait pas ce que contient le planning. */
          <div
            role="alert"
            className="mt-8 flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" aria-hidden />
              <h2 className="font-display text-base font-semibold text-destructive">
                Impossible de charger les menus
              </h2>
            </div>
            <p className="font-body text-sm text-muted-foreground">
              {loadError.message} Les menus ne sont pas perdus : ils restent
              enregistrés, seul l&apos;affichage a échoué.
            </p>
            <Button
              type="button"
              size="sm"
              className="cursor-pointer gap-2"
              onClick={() => void load()}
            >
              <RefreshCw className="size-4" aria-hidden />
              Réessayer
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {days.map((day) => {
              const key = getShopDateKey(day);
              const dayMenus = menusByDay.get(key) ?? [];
              const isToday = key === getShopDateKey();

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
              {editing ? "Modifier le menu" : "Menu de demain"}
            </h2>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              On choisit, on valide les quantités, puis on relit avant de
              planifier.
            </p>
            <MenuPlanSteps
              current={wizardStep}
              onSelect={(step) => setWizardStep(step)}
            />

            {wizardStep === 1 && (
              <div className="mt-6">
                <p className="font-body text-sm font-medium text-text">
                  Quelles pièces entre au menu ? ({selectedIds.length})
                </p>
                <div className="mt-3">
                  <MenuProductPicker
                    catalog={catalog}
                    selectedIds={selectedIds}
                    onToggle={toggleProduct}
                  />
                </div>
                <div className="mt-6 flex gap-2">
                  <Button
                    type="button"
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      if (selectedIds.length === 0) {
                        toast.error("Choisissez au moins une création.");
                        return;
                      }
                      setWizardStep(2);
                    }}
                  >
                    Valider la sélection
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
            )}

            {wizardStep === 2 && (
              <div className="mt-6">
                <p className="font-body text-sm font-medium text-text">
                  Ordre et quantité du jour
                </p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  C’est le stock remis à l’ouverture à 20 h, pas le stock
                  catalogue.
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
                          dailyQty={dailyQty[id] ?? 0}
                          onDailyQtyChange={(qty) =>
                            setDailyQty((prev) => ({ ...prev, [id]: qty }))
                          }
                          onChange={(patch) => updateProductDraft(id, patch)}
                          onMove={(dir) => moveProduct(index, dir)}
                          onRemove={() => toggleProduct(id)}
                          canMoveUp={index > 0}
                          canMoveDown={index < selectedIds.length - 1}
                        />
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-6 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setWizardStep(1)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      if (selectedIds.length === 0) {
                        toast.error("Il ne reste aucune pièce.");
                        setWizardStep(1);
                        return;
                      }
                      setWizardStep(3);
                    }}
                  >
                    Voir la revue
                  </Button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="menu-date">Jour servi</Label>
                    <Input
                      id="menu-date"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="menu-time">Ouverture (veille)</Label>
                    <Input
                      id="menu-time"
                      type="time"
                      value={activateTime}
                      onChange={(e) => setActivateTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="font-body text-xs text-muted-foreground">
                  {targetDate
                    ? `Service le ${formatShopDateFr(targetDate)}. Ouverture des ventes le ${formatShopDateFr(addShopDays(targetDate, -1))} à ${activateTime}.`
                    : "Choisissez le jour servi."}
                </p>
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
                  {selectedIds.map((id, index) => {
                    const draft = productDrafts[id];
                    if (!draft) return null;
                    const qty = dailyQty[id] ?? 0;
                    return (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-3 bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-body text-sm font-semibold text-primary">
                            {index + 1}. {draft.name}
                          </p>
                          <p className="font-body text-xs text-muted-foreground">
                            {formatPrice(draft.price)}
                            {draft.keyword ? ` · ${draft.keyword}` : ""}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "shrink-0 font-body text-sm font-semibold tabular-nums",
                            qty <= 0 ? "text-destructive" : "text-primary",
                          )}
                        >
                          {qty <= 0 ? "Qté à préciser" : `${qty} pcs`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setWizardStep(2)}
                  >
                    Retour
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 cursor-pointer"
                    disabled={
                      saving ||
                      selectedIds.some((id) => (dailyQty[id] ?? 0) <= 0)
                    }
                    onClick={() => void saveMenu()}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : editing ? (
                      "Confirmer la modification"
                    ) : (
                      "Planifier ce menu"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {menus.length === 0 && !loading && !loadError && (
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
