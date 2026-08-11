"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, BellOff, Loader2, Plus, RefreshCw, Volume2 } from "lucide-react";
import { toast } from "sonner";

import {
  getShopDateKey,
  getTomorrowShopDateKey,
  isTomorrowAtShop,
  SHOP_TIME_ZONE,
} from "@/lib/business-date";
import { Button } from "@/components/ui/button";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminOrderFormSheet } from "@/components/admin/admin-order-form-sheet";
import { OrderBoardCard } from "@/components/admin/order-board-card";
import {
  BOARD_TAB_LABELS,
  STATUS_DOT_CLASS,
  type OrderBoardTab,
  clientLabel,
  countByTab,
  filterOrdersByTab,
} from "@/lib/admin/order-board";
import { useOrderRealtime } from "@/lib/hooks/use-order-realtime";
import { useOrderNotifications } from "@/lib/hooks/use-order-notifications";
import { formatPrice } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type SavedOrder,
} from "@/types/order";
import { cn } from "@/lib/utils";

type DriverOption = {
  id: string;
  name: string;
  isActive: boolean;
};

const TAB_ORDER: OrderBoardTab[] = ["nouvelles", "preparation", "livraison"];
const POLL_MS = 8_000;

function parseTab(value: string | null): OrderBoardTab {
  if (value === "preparation" || value === "livraison" || value === "nouvelles") {
    return value;
  }
  return "nouvelles";
}

/** Date lisible dans le fuseau boutique — jamais celui du navigateur admin. */
function formatShopDayLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    timeZone: SHOP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const LIVRAISON_SORT: Record<string, number> = {
  prete: 0,
  en_livraison: 1,
  livree: 2,
};

export function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const activeTab = parseTab(searchParams.get("tab"));
  const [pendingDriver, setPendingDriver] = useState<Record<string, string>>(
    {},
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SavedOrder | null>(null);
  const notifications = useOrderNotifications();
  const knownIdsRef = useRef<Set<string> | null>(null);
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const setActiveTab = useCallback(
    (tab: OrderBoardTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/admin/commandes?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const announceNewOrders = useCallback((incoming: SavedOrder[]) => {
    const known = knownIdsRef.current;
    if (!known) {
      // Premier chargement : on mémorise sans alerter (évite le bip au refresh).
      knownIdsRef.current = new Set(incoming.map((o) => o.id));
      return;
    }

    const fresh = incoming.filter((o) => !known.has(o.id));
    for (const order of fresh) {
      known.add(order.id);
      notificationsRef.current.notify(
        "Nouvelle commande",
        `Commande ${order.id} — ${ORDER_STATUS_LABELS[order.status]}.`,
      );
    }

    // Garde le set à jour aussi pour les IDs déjà connus (pas de croissance infinie inutile).
    for (const order of incoming) known.add(order.id);
  }, []);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      try {
        const response = await fetch("/api/admin/orders", { cache: "no-store" });
        if (!response.ok) throw new Error("Erreur");
        const data = (await response.json()) as { orders: SavedOrder[] };
        announceNewOrders(data.orders);
        setOrders(data.orders);
      } catch {
        if (!options?.silent) setOrders([]);
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [announceNewOrders],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Fallback si Realtime Supabase est down : polling + bip sur nouvelles commandes.
  useEffect(() => {
    if (!notifications.enabled) return;
    const timer = window.setInterval(() => {
      void load({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [notifications.enabled, load]);

  useEffect(() => {
    void fetch("/api/admin/drivers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { drivers?: DriverOption[] } | null) => {
        if (data?.drivers) setDrivers(data.drivers.filter((d) => d.isActive));
      })
      .catch(() => null);
  }, []);

  useOrderRealtime({
    enabled: notifications.enabled,
    onStatusChange: (row) => {
      const known = knownIdsRef.current;
      const isNew = known ? !known.has(row.id) : false;

      setOrders((prev) => {
        const exists = prev.some((o) => o.id === row.id);
        if (!exists) return prev;
        return prev.map((o) =>
          o.id === row.id ? { ...o, status: row.status } : o,
        );
      });

      if (isNew) {
        known?.add(row.id);
        notificationsRef.current.notify(
          "Nouvelle commande",
          `Commande ${row.id} reçue — à préparer.`,
        );
        void load({ silent: true });
      } else if (known) {
        // Statut mis à jour sur une commande déjà connue.
        known.add(row.id);
      }
    },
  });

  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (!focusId || loading) return;
    const order = orders.find((o) => o.id === focusId);
    if (!order) return;
    const tab =
      order.status === "recue" || order.status === "paiement_confirme"
        ? "nouvelles"
        : order.status === "preparation"
          ? "preparation"
          : "livraison";
    if (activeTab !== tab) {
      setActiveTab(tab);
      return;
    }
    setExpandedId(focusId);
    requestAnimationFrame(() => {
      document
        .getElementById(`order-${focusId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [searchParams, loading, orders, activeTab, setActiveTab]);

  // Le tableau couvre la journée boutique en cours + le lendemain : dès 20 h les
  // clientes réservent pour demain, la prod doit les voir tout de suite.
  const boardDateKeys = useMemo(() => {
    const now = new Date();
    return new Set([getShopDateKey(now), getTomorrowShopDateKey(now)]);
  }, []);

  const boardOrders = useMemo(
    () =>
      orders
        .filter((order) => {
          // Paiement pas confirmé (en cours ou échoué) : ne doit jamais remonter côté admin.
          if (order.status === "recue") return false;
          if (order.status === "annulee") return false;
          if (!order.scheduledSlotStart) return false;
          return boardDateKeys.has(getShopDateKey(order.scheduledSlotStart));
        })
        .sort((a, b) => {
          const ta = a.scheduledSlotStart
            ? new Date(a.scheduledSlotStart).getTime()
            : 0;
          const tb = b.scheduledSlotStart
            ? new Date(b.scheduledSlotStart).getTime()
            : 0;
          return ta - tb;
        }),
    [orders, boardDateKeys],
  );

  const tabCounts = useMemo(() => countByTab(boardOrders), [boardOrders]);

  const tabOrders = useMemo(() => {
    const filtered = filterOrdersByTab(boardOrders, activeTab);
    if (activeTab !== "livraison") return filtered;
    return [...filtered].sort(
      (a, b) =>
        (LIVRAISON_SORT[a.status] ?? 9) - (LIVRAISON_SORT[b.status] ?? 9),
    );
  }, [boardOrders, activeTab]);

  const cancelledToday = useMemo(
    () =>
      orders.filter((order) => {
        if (order.status !== "annulee") return false;
        if (!order.scheduledSlotStart) return false;
        return boardDateKeys.has(getShopDateKey(order.scheduledSlotStart));
      }),
    [orders, boardDateKeys],
  );

  const tomorrowCount = useMemo(
    () =>
      boardOrders.filter((order) => isTomorrowAtShop(order.scheduledSlotStart!))
        .length,
    [boardOrders],
  );

  const updateStatus = useCallback(
    async (orderId: string, status: OrderStatus, previous: OrderStatus) => {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error("Impossible de changer le statut");
        return;
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
      toast.success(`→ ${ORDER_STATUS_LABELS[status]}`, {
        action: {
          label: "Annuler",
          onClick: () => {
            void updateStatus(orderId, previous, status);
          },
        },
        duration: 5000,
      });
    },
    [],
  );

  const assignDriver = useCallback(
    async (
      orderId: string,
      driverId: string | null,
      previous: string | null,
    ) => {
      const res = await fetch(`/api/admin/orders/${orderId}/driver`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Assignation impossible");
        return;
      }
      const data = (await res.json()) as { order: SavedOrder };
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? data.order : o)),
      );
      const name =
        drivers.find((d) => d.id === driverId)?.name ??
        data.order.driverName ??
        "livreur";
      toast.success(driverId ? `Assigné à ${name}` : "Livreur retiré");
      setPendingDriver((prev) => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });
      void previous;
    },
    [drivers],
  );

  const scrollToOrder = (orderId: string, tab: OrderBoardTab) => {
    setActiveTab(tab);
    requestAnimationFrame(() => {
      document
        .getElementById(`order-${orderId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const openCreate = () => {
    setEditingOrder(null);
    setFormOpen(true);
  };

  const openEdit = (order: SavedOrder) => {
    setEditingOrder(order);
    setFormOpen(true);
  };

  const handleSaved = (order: SavedOrder) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === order.id);
      if (exists) return prev.map((o) => (o.id === order.id ? order : o));
      return [order, ...prev];
    });
  };

  const handleDelete = useCallback(async (orderId: string) => {
    if (
      !window.confirm(
        `Supprimer définitivement la commande ${orderId} ? Impossible à annuler.`,
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.error(data?.error ?? "Suppression impossible");
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    toast.success("Commande supprimée");
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">
            Commandes
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {formatShopDayLabel(new Date())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={notifications.enabled ? "default" : "outline"}
            size="sm"
            className="cursor-pointer gap-2"
            onClick={() => {
              const turningOn = !notifications.enabled;
              notifications.toggle();
              if (turningOn) {
                toast.success("Alertes activées — vous devez entendre un bip.");
              }
            }}
            title={
              notifications.enabled
                ? "Notifications activées — cliquez pour couper"
                : "Activer le son et les alertes pour les nouvelles commandes"
            }
            aria-pressed={notifications.enabled}
          >
            {notifications.enabled ? (
              <Bell className="size-4" aria-hidden />
            ) : (
              <BellOff className="size-4" aria-hidden />
            )}
            {notifications.enabled ? "Alertes activées" : "Alertes"}
          </Button>
          {notifications.enabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer gap-2"
              onClick={() => {
                notifications.testSound();
                toast.message("Bip de test envoyé");
              }}
              title="Tester le son"
            >
              <Volume2 className="size-4" aria-hidden />
              Tester le son
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer gap-2"
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" aria-hidden />
            Actualiser
          </Button>
          <Button
            type="button"
            size="sm"
            className="cursor-pointer gap-2"
            onClick={openCreate}
          >
            <Plus className="size-4" aria-hidden />
            Nouvelle commande
          </Button>
        </div>
      </header>

      {notifications.enabled && (
        <p className="rounded-xl border border-secondary/60 bg-secondary/20 px-4 py-2.5 font-body text-sm text-text">
          Son actif — nouvelles commandes détectées en direct
          {notifications.audioReady ? "" : " (cliquez « Tester le son » si besoin)"}.
          {notifications.permission === "denied"
            ? " Les pop-ups desktop sont bloquées par le navigateur."
            : ""}
        </p>
      )}

      {notifications.enabled && notifications.permission === "denied" && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-body text-sm text-amber-800">
          Autorisez les notifications du site dans le navigateur pour les alertes
          hors onglet. Le son fonctionne dès que les alertes sont activées.
        </p>
      )}

      {tomorrowCount > 0 && (
        <p className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 font-body text-sm text-text">
          {tomorrowCount === 1
            ? "1 commande est réservée pour demain"
            : `${tomorrowCount} commandes sont réservées pour demain`}{" "}
          — elles portent le badge « Demain » et sont à préparer le lendemain.
        </p>
      )}

      {boardOrders.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Aujourd&apos;hui et demain
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {boardOrders.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3 py-2.5 text-left font-body text-sm hover:bg-muted/40"
                  onClick={() => {
                    const tab =
                      order.status === "recue" ||
                      order.status === "paiement_confirme"
                        ? "nouvelles"
                        : order.status === "preparation"
                          ? "preparation"
                          : "livraison";
                    scrollToOrder(order.id, tab);
                  }}
                >
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      STATUS_DOT_CLASS[order.status],
                    )}
                    aria-hidden
                  />
                  <span className="font-medium text-primary">{order.id}</span>
                  {isTomorrowAtShop(order.scheduledSlotStart!) && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      Demain
                    </span>
                  )}
                  <span className="truncate text-text">
                    {clientLabel(order)}
                  </span>
                  <span className="ml-auto shrink-0 font-semibold text-text">
                    {formatPrice(order.total)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div
        className="flex gap-1 rounded-2xl border border-border bg-muted/30 p-1"
        role="tablist"
        aria-label="Vues commandes"
      >
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={cn(
              "min-h-11 flex-1 cursor-pointer rounded-xl px-3 py-2 font-body text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-text",
            )}
            onClick={() => setActiveTab(tab)}
          >
            {BOARD_TAB_LABELS[tab]}
            <span className="ml-1.5 text-xs opacity-70">({tabCounts[tab]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 font-body text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Chargement…
        </div>
      ) : tabOrders.length === 0 ? (
        <AdminEmptyState
          variant="orders"
          title={`File « ${BOARD_TAB_LABELS[activeTab]} » vide`}
          description="Rien à avancer ici pour le moment. Passe à un autre onglet ou attends la prochaine commande."
        />
      ) : (
        <div className="space-y-4">
          {tabOrders.map((order) => (
            <div key={order.id} id={`order-${order.id}`}>
              <OrderBoardCard
                order={order}
                drivers={drivers}
                pendingDriverId={pendingDriver[order.id] ?? ""}
                expanded={expandedId === order.id}
                onToggleExpand={() =>
                  setExpandedId((id) => (id === order.id ? null : order.id))
                }
                onStatusChange={updateStatus}
                onAssignDriver={assignDriver}
                onPendingDriverChange={(orderId, driverId) =>
                  setPendingDriver((prev) => ({
                    ...prev,
                    [orderId]: driverId,
                  }))
                }
                onEdit={() => openEdit(order)}
                onDelete={() => void handleDelete(order.id)}
              />
            </div>
          ))}
        </div>
      )}

      <AdminOrderFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        order={editingOrder ?? undefined}
        onSaved={handleSaved}
      />

      {cancelledToday.length > 0 && (
        <section className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
          <h2 className="font-display text-sm font-semibold text-destructive">
            Annulées ({cancelledToday.length})
          </h2>
          <ul className="mt-2 space-y-1 font-body text-sm text-muted-foreground">
            {cancelledToday.map((o) => (
              <li key={o.id}>
                {o.id} — {clientLabel(o)} — {formatPrice(o.total)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center font-body text-xs text-muted-foreground">
        Nouvelle · Préparation · Prête · Livraison · Livrée
      </p>
    </div>
  );
}
