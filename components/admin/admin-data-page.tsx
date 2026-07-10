"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DeliveryConfig } from "@/lib/delivery/types";
import type { SavedOrder } from "@/types/order";

type AdminDataResponse = {
  deliveryConfig: DeliveryConfig;
  orders: SavedOrder[];
  slotBookings: Record<string, number>;
  storage: Record<string, string>;
};

export function AdminDataPage() {
  const [data, setData] = useState<AdminDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/data", { cache: "no-store" });
      if (!response.ok) throw new Error("Accès refusé");
      setData((await response.json()) as AdminDataResponse);
    } catch {
      setError("Impossible de charger les données.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 font-display text-3xl font-semibold text-primary">
            <Database className="size-8" aria-hidden />
            Données serveur
          </h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Source unique : Postgres via Prisma (Supabase). Aucun fichier
            local <code className="text-xs">data/*.json</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="cursor-pointer gap-2"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className="size-4" aria-hidden />
            Actualiser
          </Button>
        </div>
      </header>

      {loading && (
        <div className="flex items-center gap-2 font-body text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Chargement...
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 font-body text-sm text-destructive">
          {error}
        </p>
      )}

      {data && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.storage).map(([key, value]) => (
              <div
                key={key}
                className="rounded-2xl border border-border bg-card p-4 font-body text-sm"
              >
                <p className="font-medium text-primary">{key}</p>
                <p className="mt-1 text-muted-foreground">{value}</p>
              </div>
            ))}
          </section>

          <DataBlock
            title={`Commandes (${data.orders.length})`}
            json={data.orders}
          />
          <DataBlock title="Configuration livraison" json={data.deliveryConfig} />
          <DataBlock title="Réservations créneaux (mémoire)" json={data.slotBookings} />
        </>
      )}
    </div>
  );
}

function DataBlock({ title, json }: { title: string; json: unknown }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold text-primary">{title}</h2>
      <pre className="mt-4 max-h-[28rem] overflow-auto rounded-xl bg-bg p-4 font-mono text-xs leading-relaxed text-text">
        {JSON.stringify(json, null, 2)}
      </pre>
    </section>
  );
}
