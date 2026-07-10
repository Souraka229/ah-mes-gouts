"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import { getSlotsForDate } from "@/lib/delivery/slots";
import { useDeliveryConfig } from "@/lib/hooks/use-delivery-config";
import { useOrderRealtime } from "@/lib/hooks/use-order-realtime";
import { formatPrice } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_FLOW,
  type OrderStatus,
  type SavedOrder,
} from "@/types/order";
import { cn } from "@/lib/utils";

const STATUS_SHORTCUTS: Partial<Record<string, OrderStatus>> = {
  p: "preparation",
  r: "prete",
  l: "en_livraison",
  v: "livree",
};

type DriverOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotFilter, setSlotFilter] = useState<string | "all">("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const { schedules } = useDeliveryConfig();

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

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todaySlots = useMemo(() => {
    const delivery = getSlotsForDate(schedules, "delivery", today);
    const pickup = getSlotsForDate(schedules, "pickup", today);
    const merged = [...delivery, ...pickup];
    const unique = new Map<string, string>();
    for (const slot of merged) unique.set(slot.slotKey, slot.label);
    return Array.from(unique.entries()).map(([key, label]) => ({ key, label }));
  }, [schedules, today]);

  const todayOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (!order.scheduledSlotStart) return false;
        const start = new Date(order.scheduledSlotStart);
        return start.toDateString() === today.toDateString();
      }),
    [orders, today],
  );

  const slotCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of todayOrders) {
      if (!order.scheduledSlotStart) continue;
      const key = `${order.fulfillmentType ?? order.mode}:${order.scheduledSlotStart}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [todayOrders]);

  const filteredOrders =
    slotFilter === "all"
      ? todayOrders
      : todayOrders.filter((order) => {
          if (!order.scheduledSlotStart) return false;
          const key = `${order.fulfillmentType ?? order.mode}:${order.scheduledSlotStart}`;
          return key === slotFilter;
        });

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
      toast.success(`Statut → ${ORDER_STATUS_LABELS[status]}`, {
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
    async (orderId: string, driverId: string | null, previous: string | null) => {
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
      if (previous && previous !== driverId) {
        // no undo for driver assign — keep simple
      }
    },
    [drivers],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (filteredOrders.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredOrders.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }

      const shortcut = STATUS_SHORTCUTS[e.key.toLowerCase()];
      if (shortcut) {
        const order = filteredOrders[selectedIndex];
        if (order) {
          e.preventDefault();
          void updateStatus(order.id, shortcut, order.status);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filteredOrders, selectedIndex, updateStatus]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold text-primary">
          Commandes du jour
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          {today.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {" — "}statuts et livreurs mis à jour en temps réel
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold text-primary">
          Filtre par créneau (aujourd&apos;hui)
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSlotFilter("all")}
            className={cn(
              "min-h-11 cursor-pointer rounded-2xl border px-4 py-2 font-body text-sm font-medium",
              slotFilter === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-bg hover:border-primary/40",
            )}
          >
            Tous ({todayOrders.length})
          </button>
          {todaySlots.map((slot) => {
            const count = slotCounts.get(slot.key) ?? 0;
            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => setSlotFilter(slot.key)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-2xl border px-4 py-2 font-body text-sm font-medium",
                  slotFilter === slot.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-bg hover:border-primary/40",
                )}
              >
                {slot.label} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 font-body text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Chargement des commandes...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <Package className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-4 font-body text-sm text-muted-foreground">
            Aucune commande pour ce créneau aujourd&apos;hui. Les nouvelles
            commandes apparaîtront ici automatiquement.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={() => void load()}
          >
            Actualiser
          </Button>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {filteredOrders.map((order, index) => (
            <article
              key={order.id}
              className={cn(
                "rounded-2xl border bg-card p-5 transition-colors",
                index === selectedIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border",
              )}
              onClick={() => setSelectedIndex(index)}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-display text-lg font-semibold text-primary">
                    {order.id}
                  </p>
                  <p className="mt-1 font-body text-sm text-muted-foreground">
                    {order.client.firstName} {order.client.lastName} —{" "}
                    {order.client.phone}
                  </p>
                  <p className="mt-2 font-body text-sm text-text">
                    {formatFulfillmentSummary(order)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-body text-sm font-semibold text-text">
                    {formatPrice(order.total)}
                  </p>
                  <select
                    value={order.status}
                    title="Changer le statut de la commande"
                    className="cursor-pointer rounded-xl border border-border bg-bg px-3 py-2 font-body text-sm"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const next = e.target.value as OrderStatus;
                      if (next !== order.status) {
                        void updateStatus(order.id, next, order.status);
                      }
                    }}
                  >
                    {ORDER_STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABELS[s]}
                      </option>
                    ))}
                    <option value="annulee">{ORDER_STATUS_LABELS.annulee}</option>
                  </select>
                  {(order.status === "prete" || order.driverId) && (
                    <select
                      value={order.driverId ?? ""}
                      title="Assigner un livreur"
                      className="cursor-pointer rounded-xl border border-border bg-bg px-3 py-2 font-body text-sm"
                      onClick={(e) => e.stopPropagation()}
                      disabled={order.status !== "prete" && !order.driverId}
                      onChange={(e) => {
                        const next = e.target.value || null;
                        if (next !== (order.driverId ?? null)) {
                          void assignDriver(
                            order.id,
                            next,
                            order.driverId ?? null,
                          );
                        }
                      }}
                    >
                      <option value="">
                        {order.driverName
                          ? `Livreur : ${order.driverName}`
                          : "— Livreur —"}
                      </option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {filteredOrders.length > 0 && (
        <p className="text-center font-body text-xs text-muted-foreground">
          ↑↓ naviguer · P préparation · R prête · L en livraison · V livrée
        </p>
      )}
    </div>
  );
}
