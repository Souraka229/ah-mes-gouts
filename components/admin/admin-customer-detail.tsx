"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Loader2,
  Package,
  RefreshCw,
  Smartphone,
} from "lucide-react";

import type { AppError } from "@/lib/api/errors";
import { safeFetch } from "@/lib/api/safe-fetch";
import { Button } from "@/components/ui/button";
import { formatOrderItem } from "@/lib/admin/order-board";
import { formatPrice } from "@/lib/format";
import type { AdminCustomerDetail } from "@/types/crm";
import { ORDER_STATUS_LABELS, RECEPTION_MODE_LABELS } from "@/types/order";
import { cn } from "@/lib/utils";

const ACTIVITY_LABELS: Record<string, string> = {
  PRODUCT_VIEW: "Vue produit",
  ADD_TO_CART: "Ajout panier",
  CHECKOUT_START: "Checkout",
  ORDER_PLACED: "Commande",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AdminCustomerDetailPage({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  /** Panne de chargement — distincte d'un client réellement introuvable. */
  const [loadError, setLoadError] = useState<AppError | null>(null);
  /** Au moins un chargement réussi : sinon un échec initial n'est pas « vide ». */
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await safeFetch<{ customer: AdminCustomerDetail }>(
      `/api/admin/customers/${customerId}`,
      { requireJson: true },
    );

    if (result.ok) {
      setCustomer(result.data?.customer ?? null);
      setLoadError(null);
      setHasLoaded(true);
    } else {
      // Une panne ne prouve pas que le client a disparu : on garde la fiche
      // affichée et on signale l'incident.
      setLoadError(result.error);
    }

    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Le composant est réutilisé quand on passe d'une fiche client à une autre :
  // sans cette remise à zéro, la fiche précédente resterait affichée sous la
  // nouvelle URL, et une panne la figerait là.
  useEffect(() => {
    setCustomer(null);
    setLoadError(null);
    setHasLoaded(false);
  }, [customerId]);

  if (loading && !hasLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 font-body text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Chargement…
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 font-body text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Clients
        </Link>
        {loadError && !hasLoaded ? (
          /* Premier chargement en échec : « client introuvable » accuserait à
             tort le carnet alors qu'on n'a rien pu lire. */
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" aria-hidden />
              <h2 className="font-display text-base font-semibold text-destructive">
                Impossible de charger la fiche client
              </h2>
            </div>
            <p className="font-body text-sm text-muted-foreground">
              {loadError.message}
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
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 font-body text-sm text-destructive">
            Client introuvable
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 font-body text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Clients
        </Link>
        <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
              {customer.displayName}
            </h1>
            <p className="mt-1 font-body text-sm tabular-nums text-muted-foreground">
              {customer.phoneDisplay}
            </p>
          </div>
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-accent-foreground"
          >
            Appeler
          </a>
        </header>
      </div>

      {/* Panne survenue alors que la fiche était déjà affichée : on garde les
          données connues et on prévient, plutôt que de tout effacer. */}
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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Dépensé" value={formatPrice(customer.totalSpent)} />
        <Stat label="Commandes" value={String(customer.ordersCount)} />
        <Stat label="Première" value={formatDate(customer.firstOrderAt)} />
        <Stat label="Dernière" value={formatDate(customer.lastOrderAt)} />
      </section>

      {customer.favoriteProducts.length > 0 && (
        <p className="font-body text-sm text-muted-foreground">
          <span className="font-semibold text-primary">Favoris · </span>
          {customer.favoriteProducts.join(" · ")}
          {customer.devicesCount > 0 && (
            <span className="ml-3 inline-flex items-center gap-1">
              <Smartphone className="size-3.5" aria-hidden />
              {customer.devicesCount} appareil
              {customer.devicesCount > 1 ? "s" : ""}
            </span>
          )}
        </p>
      )}

      <section className="rounded-[20px] border border-border/80 bg-white p-5">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-primary">
          <Package className="size-5" aria-hidden />
          Historique commandes
        </h2>
        {customer.orders.length === 0 ? (
          <p className="mt-4 font-body text-sm text-muted-foreground">
            Aucune commande rattachée.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/70">
            {customer.orders.map((order) => (
              <li key={order.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/commandes?focus=${order.id}`}
                      className="font-body text-sm font-semibold text-primary hover:underline"
                    >
                      {order.id}
                    </Link>
                    <p className="mt-0.5 font-body text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)} ·{" "}
                      {ORDER_STATUS_LABELS[order.status]} ·{" "}
                      {
                        RECEPTION_MODE_LABELS[
                          order.fulfillmentType ?? order.mode
                        ]
                      }
                    </p>
                    <p className="mt-1 font-body text-xs text-text">
                      {order.items
                        .map((i) => `${i.quantity}× ${formatOrderItem(i)}`)
                        .join(", ")}
                    </p>
                    {(order.client.address || order.client.landmark) && (
                      <p className="mt-1 font-body text-xs text-muted-foreground">
                        {[order.client.address, order.client.landmark]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-body text-sm font-semibold tabular-nums text-primary">
                    {formatPrice(order.total)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[20px] border border-border/80 bg-white p-5">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-primary">
          <Clock3 className="size-5" aria-hidden />
          Activité récente
        </h2>
        {customer.recentActivity.length === 0 ? (
          <p className="mt-4 font-body text-sm text-muted-foreground">
            Pas encore de navigation trackée sur cet appareil lié.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {customer.recentActivity.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-bg/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-body text-sm font-medium text-text">
                    {ACTIVITY_LABELS[a.type] ?? a.type}
                    {a.productName ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {a.productName}
                      </span>
                    ) : null}
                  </p>
                </div>
                <time className="shrink-0 font-body text-xs text-muted-foreground">
                  {formatDateTime(a.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article
      className={cn(
        "rounded-[16px] border border-border/80 bg-white px-4 py-3",
      )}
    >
      <p className="font-body text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-body text-lg font-semibold text-primary tabular-nums">
        {value}
      </p>
    </article>
  );
}
