"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useOrderRealtime } from "@/lib/hooks/use-order-realtime";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/types/order";
import type { DriverOrderView, DriverPortalData } from "@/types/driver";
import { cn } from "@/lib/utils";

type DriverPortalProps = {
  accessToken: string;
};

export function DriverPortal({ accessToken }: DriverPortalProps) {
  const [data, setData] = useState<DriverPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/livreur/${accessToken}/orders`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setInvalid(true);
        setData(null);
        return;
      }
      const json = (await res.json()) as DriverPortalData;
      setData(json);
      setInvalid(false);
    } catch {
      toast.error("Connexion impossible");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useOrderRealtime({
    onStatusChange: () => {
      void load();
    },
  });

  const patchOrder = (orderId: string, patch: Partial<DriverOrderView>) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === orderId ? { ...o, ...patch } : o,
        ),
      };
    });
  };

  const startDelivery = async (order: DriverOrderView) => {
    if (order.status !== "prete") return;
    setBusyId(order.id);
    try {
      const res = await fetch(
        `/api/livreur/${accessToken}/orders/${order.id}/start`,
        { method: "POST" },
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Action impossible");
      patchOrder(order.id, {
        status: "en_livraison",
        driverStartedAt: new Date().toISOString(),
      });
      toast.success("Livraison démarrée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const markDelivered = async (order: DriverOrderView) => {
    if (order.status !== "en_livraison") return;
    setBusyId(order.id);
    try {
      const res = await fetch(
        `/api/livreur/${accessToken}/orders/${order.id}/deliver`,
        { method: "POST" },
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Action impossible");
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          orders: prev.orders.filter((o) => o.id !== order.id),
        };
      });
      toast.success("Commande livrée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
      void load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 font-body text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Chargement…
      </div>
    );
  }

  if (invalid || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Truck className="mx-auto size-12 text-muted-foreground/40" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-primary">
          Lien invalide
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Ce lien livreur n&apos;est plus actif. Contactez l&apos;administration.
        </p>
      </div>
    );
  }

  const todayLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-24">
      <header className="mb-6">
        <p className="font-body text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Portail livreur
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-primary">
          Bonjour {data.driver.firstName}
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          {todayLabel} — {data.orders.length} livraison
          {data.orders.length !== 1 ? "s" : ""}
        </p>
      </header>

      {data.orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <Package className="mx-auto size-10 text-muted-foreground/50" />
          <p className="mt-4 font-body text-sm text-muted-foreground">
            Aucune livraison assignée pour aujourd&apos;hui.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {data.orders.map((order) => (
            <li
              key={order.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-primary">
                    {order.id}
                  </p>
                  <p className="mt-1 font-body text-sm font-medium text-text">
                    {ORDER_STATUS_LABELS[order.status]}
                  </p>
                </div>
                <p className="font-body text-sm font-semibold text-text">
                  {formatPrice(order.total)}
                </p>
              </div>

              <div className="mt-4 space-y-2 font-body text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {order.deliveryAddress}
                    {order.landmark ? ` — ${order.landmark}` : ""}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0 text-primary" />
                  <a
                    href={`tel:${order.clientPhone}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {order.clientPhone}
                  </a>
                  <span className="text-text">
                    ({order.isGift && order.recipientName
                      ? order.recipientName
                      : order.clientFirstName}
                    )
                  </span>
                </p>
                {order.collectOnDelivery && (
                  <p className="rounded-xl bg-secondary/30 px-3 py-2 text-xs font-medium text-text">
                    Paiement à la livraison — prévoir la monnaie
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                {order.status === "prete" && (
                  <Button
                    type="button"
                    size="lg"
                    className="min-h-12 w-full cursor-pointer gap-2"
                    disabled={busyId === order.id}
                    onClick={() => void startDelivery(order)}
                  >
                    {busyId === order.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Navigation className="size-4" />
                    )}
                    Démarrer la livraison
                  </Button>
                )}
                {order.status === "en_livraison" && (
                  <Button
                    type="button"
                    size="lg"
                    className={cn(
                      "min-h-12 w-full cursor-pointer gap-2",
                      "bg-success text-success-foreground hover:bg-success/90",
                    )}
                    disabled={busyId === order.id}
                    onClick={() => void markDelivered(order)}
                  >
                    {busyId === order.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Package className="size-4" />
                    )}
                    Marquer livrée
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
