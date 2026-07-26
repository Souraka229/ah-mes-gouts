import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { formatPrice } from "@/lib/format";
import { getDriverHistory } from "@/lib/server/driver-repository";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  recue: "Reçue",
  paiement_confirme: "Paiement confirmé",
  preparation: "Préparation",
  prete: "Prête",
  en_livraison: "En livraison",
  livree: "Livrée",
  annulee: "Annulée",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DriverHistoryPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const data = await getDriverHistory(id, page, 20);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-3">
        <Link
          href="/admin/livreurs"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-body text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Livreurs
        </Link>
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary">
            {data.driver.name}
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {data.driver.phone}
            {" · "}
            {data.driver.isActive ? "Actif" : "Inactif"}
            {" · Dernière commande : "}
            {formatDateTime(data.summary.lastOrderAt)}
          </p>
        </div>
        <p className="font-body text-sm text-muted-foreground">
          {data.summary.totalOrders} commandes · {data.summary.deliveredOrders}{" "}
          livrées · {data.summary.activeOrders} en cours
          {data.summary.averageDeliveryMinutes != null
            ? ` · ${data.summary.averageDeliveryMinutes} min en moyenne`
            : ""}
        </p>
      </header>

      <section>
        <h2 className="font-display text-xl font-semibold text-primary">
          Commandes
        </h2>
        {data.orders.length === 0 ? (
          <p className="mt-4 font-body text-sm text-muted-foreground">
            Aucune commande.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[40rem] font-body text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Commande</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Quartier</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Départ</th>
                  <th className="px-4 py-3 font-medium">Livrée</th>
                  <th className="px-4 py-3 font-medium text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium text-primary">
                      {order.id}
                      {order.durationMinutes != null && (
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {order.durationMinutes} min
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{order.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.zoneName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {STATUS_LABELS[order.status] ?? order.status}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatTime(order.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatTime(order.deliveredAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatPrice(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          {data.pagination.page > 1 ? (
            <Link
              href={`/admin/livreurs/${id}?page=${data.pagination.page - 1}`}
              className="font-body text-sm text-primary hover:underline"
            >
              Précédent
            </Link>
          ) : (
            <span />
          )}
          <span className="font-body text-xs text-muted-foreground">
            Page {data.pagination.page} / {data.pagination.totalPages}
          </span>
          {data.pagination.page < data.pagination.totalPages ? (
            <Link
              href={`/admin/livreurs/${id}?page=${data.pagination.page + 1}`}
              className="font-body text-sm text-primary hover:underline"
            >
              Suivant
            </Link>
          ) : (
            <span />
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-primary">
          Actions
        </h2>
        {data.actions.length === 0 ? (
          <p className="mt-4 font-body text-sm text-muted-foreground">
            Aucune action.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
            {data.actions.map((action) => (
              <li key={action.id} className="px-4 py-3 font-body text-sm">
                <p className="text-text">{action.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateTime(action.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
