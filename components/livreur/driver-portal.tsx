"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  PhoneOff,
  RefreshCw,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";
import type { AppError } from "@/lib/api/errors";
import { safeFetch } from "@/lib/api/safe-fetch";
import { getMapsSearchUrl } from "@/lib/driver/portal-links";
import { useOrderRealtime } from "@/lib/hooks/use-order-realtime";
import { formatPrice } from "@/lib/format";
import type { DriverOrderView, DriverPortalData } from "@/types/driver";
import { cn } from "@/lib/utils";

const DRIVER_STATUS_LABEL: Record<DriverOrderView["status"], string> = {
  prete: "À livrer",
  en_livraison: "En cours",
};

type DriverPortalProps = {
  accessToken: string;
};

function clientDisplayName(order: DriverOrderView): string {
  if (order.isGift && order.recipientName) return order.recipientName;
  return order.clientFirstName;
}

/** zoneName déjà résolu côté serveur — pas de re-scan des quartiers. */
function formatOrderAddress(order: DriverOrderView): string {
  const parts: string[] = [];
  if (order.zoneName) parts.push(order.zoneName);
  if (
    order.deliveryAddress &&
    order.deliveryAddress !== order.zoneName
  ) {
    parts.push(order.deliveryAddress);
  }
  if (
    order.landmark &&
    order.landmark !== order.zoneName &&
    order.landmark !== order.deliveryAddress
  ) {
    parts.push(`(${order.landmark})`);
  }
  return parts.join(" — ") || "—";
}

export function DriverPortal({ accessToken }: DriverPortalProps) {
  const [data, setData] = useState<DriverPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  /**
   * Dernière panne de chargement.
   *
   * Distingue « aucune livraison » de « on n'a pas pu savoir » : un livreur
   * devant une liste vide croit sa tournée terminée.
   */
  const [loadError, setLoadError] = useState<AppError | null>(null);
  /** Au moins un chargement réussi : sinon un échec initial n'est pas « vide ». */
  const [hasLoaded, setHasLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inFlight = useRef(false);
  const orderIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await safeFetch<DriverPortalData>(
        `/api/livreur/${accessToken}/orders`,
        // La tournée doit être renvoyée : un corps vide est une anomalie, pas
        // une journée sans livraison.
        { requireJson: true },
      );

      if (result.ok) {
        setData(result.data);
        orderIdsRef.current = new Set(
          result.data?.orders?.map((order) => order.id) ?? [],
        );
        setInvalid(false);
        setLoadError(null);
        setHasLoaded(true);
        return;
      }

      // Seul un refus explicite du serveur signifie « lien invalide ». Une
      // panne réseau ne doit jamais afficher ce message : le lien est peut-être
      // parfaitement valide.
      if (result.error.status === 404 || result.error.status === 403) {
        setInvalid(true);
        setData(null);
        orderIdsRef.current = new Set();
        return;
      }

      // Panne passagère : on garde la dernière tournée connue à l'écran.
      setLoadError(result.error);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useOrderRealtime({
    onStatusChange: (row) => {
      // Nouveau ticket ou commande déjà affichée → refresh ; ignore le reste.
      if (
        orderIdsRef.current.size > 0 &&
        !orderIdsRef.current.has(row.id)
      ) {
        return;
      }
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
      const result = await safeFetch<{ order?: DriverOrderView }>(
        `/api/livreur/${accessToken}/orders/${order.id}/start`,
        { method: "POST", requireJson: true },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        // L'affichage peut être périmé : on relit la tournée.
        void load();
        return;
      }
      patchOrder(order.id, {
        status: "en_livraison",
        driverStartedAt: new Date().toISOString(),
      });
      toast.success("En cours de livraison");
    } finally {
      setBusyId(null);
    }
  };

  const markUnreachable = async (order: DriverOrderView) => {
    setBusyId(order.id);
    try {
      const result = await safeFetch<{ order?: DriverOrderView }>(
        `/api/livreur/${accessToken}/orders/${order.id}/unreachable`,
        { method: "POST", requireJson: true },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        void load();
        return;
      }
      patchOrder(order.id, { unreachableAt: new Date().toISOString() });
      toast.success("Signalé — le back office va rappeler la cliente");
    } finally {
      setBusyId(null);
    }
  };

  const markDelivered = async (order: DriverOrderView) => {
    setBusyId(order.id);
    try {
      const result = await safeFetch<{ order?: DriverOrderView }>(
        `/api/livreur/${accessToken}/orders/${order.id}/deliver`,
        { method: "POST", requireJson: true },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        void load();
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          orders: prev.orders.filter((o) => o.id !== order.id),
        };
      });
      toast.success("Livraison terminée");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 font-body text-lg text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        Chargement…
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Truck className="mx-auto size-14 text-muted-foreground/40" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-primary">
          Lien invalide
        </h1>
        <p className="mt-2 font-body text-base text-muted-foreground">
          Demandez un nouveau lien à votre responsable.
        </p>
      </div>
    );
  }

  // Premier chargement en échec : on ne sait pas si la tournée est vide. On
  // l'annonce clairement au lieu d'afficher « aucune livraison ».
  if (loadError && !hasLoaded) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" aria-hidden />
            <h1 className="font-display text-base font-semibold text-destructive">
              Impossible de charger vos livraisons
            </h1>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            {loadError.message} Vos livraisons ne sont pas perdues : seul
            l&apos;affichage a échoué.
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
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Truck className="mx-auto size-14 text-muted-foreground/40" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-primary">
          Lien invalide
        </h1>
        <p className="mt-2 font-body text-base text-muted-foreground">
          Demandez un nouveau lien à votre responsable.
        </p>
      </div>
    );
  }

  const pendingCount = data.orders.filter((o) => o.status === "prete").length;
  const activeCount = data.orders.filter(
    (o) => o.status === "en_livraison",
  ).length;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-bg px-4 py-5 pb-28">
      <header className="mb-6 rounded-2xl bg-primary px-5 py-5 text-primary-foreground">
        <p className="font-body text-sm opacity-80">
          Bonjour {data.driver.firstName}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          Aujourd&apos;hui ({data.orders.length})
        </h1>
        <p className="mt-2 font-body text-sm opacity-90">
          {pendingCount > 0 && `${pendingCount} à livrer`}
          {pendingCount > 0 && activeCount > 0 && " · "}
          {activeCount > 0 && `${activeCount} en cours`}
          {data.orders.length === 0 && "Aucune livraison pour le moment"}
        </p>
        <PwaInstallButton
          label="Installer"
          className="mt-4 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
        />
      </header>

      {/* Rafraîchissement raté alors qu'on a déjà une tournée : on garde
          l'affichage et on prévient, plutôt que de tout effacer. */}
      {loadError && hasLoaded && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3"
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

      {data.orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <Package className="mx-auto size-12 text-muted-foreground/40" />
          <p className="mt-4 font-body text-base text-muted-foreground">
            Vos livraisons apparaîtront ici dès qu&apos;une commande vous sera
            affectée.
          </p>
        </div>
      ) : (
        <ul className="space-y-5">
          {data.orders.map((order, index) => (
            <li
              key={order.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              <div
                className={cn(
                  "flex items-center justify-between px-4 py-3",
                  order.status === "prete"
                    ? "bg-secondary/25"
                    : "bg-primary/10",
                )}
              >
                <div>
                  <p className="font-body text-xs font-medium text-muted-foreground">
                    Livraison {index + 1}
                  </p>
                  <p className="font-display text-lg font-bold text-primary">
                    Commande {order.id}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                    order.status === "prete"
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {DRIVER_STATUS_LABEL[order.status]}
                </span>
              </div>

              <div className="space-y-3 px-4 py-4 font-body text-base">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Client
                  </p>
                  <p className="mt-0.5 font-semibold text-text">
                    {clientDisplayName(order)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Téléphone
                  </p>
                  <a
                    href={`tel:${order.clientPhone}`}
                    className="mt-0.5 block font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {order.clientPhone}
                  </a>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Adresse
                  </p>
                  <p className="mt-0.5 text-text">{formatOrderAddress(order)}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Montant
                  </p>
                  <p className="mt-0.5 font-display text-xl font-bold text-primary">
                    {formatPrice(order.total)}
                  </p>
                </div>

                {order.collectOnDelivery && (
                  <p className="rounded-xl bg-accent/20 px-3 py-2 text-sm font-medium text-text">
                    Paiement à récupérer à la livraison
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border bg-bg/50 p-3">
                <a
                  href={`tel:${order.clientPhone}`}
                  className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card font-body text-sm font-semibold text-primary transition-colors hover:bg-bg"
                >
                  <Phone className="size-5" aria-hidden />
                  Appeler
                </a>
                <a
                  href={getMapsSearchUrl(
                    order.deliveryAddress,
                    order.landmark,
                    order.zoneName,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card font-body text-sm font-semibold text-primary transition-colors hover:bg-bg"
                >
                  <MapPin className="size-5" aria-hidden />
                  Maps
                </a>
              </div>

              {order.unreachableAt && (
                <div className="mx-3 flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 font-body text-sm font-semibold text-red-700">
                  <PhoneOff className="size-4 shrink-0" aria-hidden />
                  Injoignable signalé — le back office rappelle la cliente
                </div>
              )}

              <div className="space-y-2 border-t border-border p-3">
                {order.status === "prete" ? (
                  <Button
                    type="button"
                    size="lg"
                    className="min-h-14 w-full cursor-pointer gap-2 text-base"
                    disabled={busyId === order.id}
                    onClick={() => void startDelivery(order)}
                  >
                    {busyId === order.id ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <Navigation className="size-5" />
                    )}
                    Je pars livrer
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="lg"
                      className="min-h-14 w-full cursor-pointer gap-2 bg-success text-base text-success-foreground hover:bg-success/90"
                      disabled={busyId === order.id}
                      onClick={() => void markDelivered(order)}
                    >
                      {busyId === order.id ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-5" />
                      )}
                      Livré
                    </Button>
                    {!order.unreachableAt && (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => void markUnreachable(order)}
                        className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 font-body text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                      >
                        <PhoneOff className="size-5" aria-hidden />
                        Client injoignable
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
