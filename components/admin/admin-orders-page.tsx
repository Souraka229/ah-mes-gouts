"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
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

function parseTab(value: string | null): OrderBoardTab {
  if (value === "preparation" || value === "livraison" || value === "nouvelles") {
    return value;
  }
  return "nouvelles";
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

  const setActiveTab = useCallback(
    (tab: OrderBoardTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/admin/commandes?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!response.ok) throw new Error("Erreur");
      const data = (await response.json()) as { orders: SavedOrder[] };
      setOrders(data.orders);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/admin/drivers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { drivers?: DriverOption[] } | null) => {
        if (data?.drivers) setDrivers(data.drivers.filter((d) => d.isActive));
      })
      .catch(() => null);
  }, []);

  useOrderRealtime({
    onStatusChange: (row) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === row.id ? { ...o, status: row.status } : o)),
      );
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

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayOrders = useMemo(
    () =>
      orders
        .filter((order) => {
          if (order.status === "annulee") return false;
          if (!order.scheduledSlotStart) return false;
          const start = new Date(order.scheduledSlotStart);
          return start.toDateString() === today.toDateString();
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
    [orders, today],
  );

  const tabCounts = useMemo(() => countByTab(todayOrders), [todayOrders]);

  const tabOrders = useMemo(() => {
    const filtered = filterOrdersByTab(todayOrders, activeTab);
    if (activeTab !== "livraison") return filtered;
    return [...filtered].sort(
      (a, b) =>
        (LIVRAISON_SORT[a.status] ?? 9) - (LIVRAISON_SORT[b.status] ?? 9),
    );
  }, [todayOrders, activeTab]);

  const cancelledToday = useMemo(
    () =>
      orders.filter((order) => {
        if (order.status !== "annulee") return false;
        if (!order.scheduledSlotStart) return false;
        return (
          new Date(order.scheduledSlotStart).toDateString() ===
          today.toDateString()
        );
      }),
    [orders, today],
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">
            Commandes
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {today.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
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
      </header>

      {todayOrders.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Aujourd&apos;hui
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {todayOrders.map((order) => (
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
              />
            </div>
          ))}
        </div>
      )}

      {cancelledToday.length > 0 && (
        <section className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
          <h2 className="font-display text-sm font-semibold text-destructive">
            Annulées aujourd&apos;hui ({cancelledToday.length})
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
