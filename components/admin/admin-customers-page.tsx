"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, Users } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import type {
  AdminCustomerListItem,
  CustomerSort,
} from "@/types/crm";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: CustomerSort; label: string }[] = [
  { value: "lastOrderAt", label: "Dernière commande" },
  { value: "totalSpent", label: "Montant dépensé" },
  { value: "ordersCount", label: "Nb commandes" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminCustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<AdminCustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(query);
  const sort = (searchParams.get("sort") as CustomerSort) || "lastOrderAt";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (sort) params.set("sort", sort);
      const res = await fetch(`/api/admin/customers?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Chargement impossible");
      }
      const data = (await res.json()) as { customers: AdminCustomerListItem[] };
      setCustomers(data.customers);
    } catch (err) {
      setCustomers([]);
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (sort !== "lastOrderAt") params.set("sort", sort);
    const qs = params.toString();
    router.replace(qs ? `/admin/clients?${qs}` : "/admin/clients", {
      scroll: false,
    });
  }, [debouncedQ, sort, router]);

  const setSort = (next: CustomerSort) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", next);
    router.replace(`/admin/clients?${params.toString()}`, { scroll: false });
  };

  const totalSpentAll = useMemo(
    () => customers.reduce((s, c) => s + c.totalSpent, 0),
    [customers],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-body text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
            CRM
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-primary sm:text-4xl">
            Clients
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {loading
              ? "Chargement…"
              : `${customers.length} client${customers.length > 1 ? "s" : ""} · ${formatPrice(totalSpentAll)} cumulés`}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher nom ou téléphone…"
            className="min-h-11 pl-10 font-body"
            aria-label="Rechercher un client"
          />
        </div>
        <div
          className="flex flex-wrap gap-1 rounded-2xl border border-border bg-muted/30 p-1"
          role="group"
          aria-label="Trier par"
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSort(opt.value)}
              className={cn(
                "min-h-10 cursor-pointer rounded-xl px-3 py-2 font-body text-xs font-medium transition-colors sm:text-sm",
                sort === opt.value
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-text",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 font-body text-sm text-destructive">
          {error}
          {error.includes("Customer") || error.includes("does not exist")
            ? " — lance `npx prisma migrate deploy` puis `npx prisma generate`."
            : null}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 font-body text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Chargement…
        </div>
      ) : customers.length === 0 ? (
        <AdminEmptyState
          variant="orders"
          title="Aucun client"
          description="Les clients apparaissent dès qu&apos;une commande est passée avec un téléphone."
        />
      ) : (
        <div className="overflow-x-auto rounded-[20px] border border-border/80 bg-white">
          <table className="w-full min-w-[44rem] font-body text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/80 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Téléphone</th>
                <th className="px-4 py-3 text-right font-medium">Commandes</th>
                <th className="px-4 py-3 text-right font-medium">Dépensé</th>
                <th className="px-4 py-3 font-medium">Dernière</th>
                <th className="px-4 py-3 font-medium">Favoris</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/60 transition-colors hover:bg-bg/70"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clients/${c.id}`}
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      {c.displayName}
                    </Link>
                    {c.firstOrderAt && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Depuis {formatDate(c.firstOrderAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text">
                    {c.phoneDisplay}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">
                    {c.ordersCount}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-text">
                    {formatPrice(c.totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(c.lastOrderAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.favoriteProducts.length > 0
                      ? c.favoriteProducts.join(" · ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && customers.length > 0 && (
        <p className="flex items-center gap-2 font-body text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden />
          Pivot = téléphone. Un client peut avoir plusieurs appareils.
        </p>
      )}
    </div>
  );
}
