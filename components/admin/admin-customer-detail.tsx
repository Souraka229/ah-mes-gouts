"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  Loader2,
  Package,
  Smartphone,
} from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Client introuvable");
      }
      const data = (await res.json()) as { customer: AdminCustomerDetail };
      setCustomer(data.customer);
    } catch (err) {
      setCustomer(null);
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 font-body text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Chargement…
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 font-body text-sm font-semibold text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Clients
        </Link>
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 font-body text-sm text-destructive">
          {error ?? "Client introuvable"}
        </p>
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
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-text"
          >
            Appeler
          </a>
        </header>
      </div>

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
                        .map((i) => `${i.quantity}× ${i.name}`)
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
