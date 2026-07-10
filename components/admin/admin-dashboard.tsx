import Link from "next/link";
import {
  Bot,
  Calendar,
  IceCreamCone,
  Package,
  Sparkles,
  Truck,
} from "lucide-react";

import { AdminSeedButton } from "@/components/admin/admin-seed-button";
import { formatPrice } from "@/lib/format";
import { getAdminActionLog } from "@/lib/server/admin-action-log";
import { getDeliveryConfig } from "@/lib/server/delivery-config-repository";
import {
  getActiveMenu,
  getNextScheduledMenu,
} from "@/lib/server/menu-repository";
import { getAllServerOrders } from "@/lib/server/order-repository";
import { getAdminCatalog } from "@/lib/server/admin-catalog-repository";
import { ORDER_STATUS_LABELS } from "@/types/order";
import { MENU_STATUS_LABELS } from "@/types/menu";

export async function AdminDashboard() {
  const [orders, { zones }, journal, activeMenu, nextMenu, catalog] =
    await Promise.all([
      getAllServerOrders(),
      getDeliveryConfig(),
      getAdminActionLog(),
      getActiveMenu(),
      getNextScheduledMenu(),
      getAdminCatalog(),
    ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ordersToday = orders.filter((o) => {
    if (!o.scheduledSlotStart) return false;
    const d = new Date(o.scheduledSlotStart);
    return d.toDateString() === today.toDateString();
  });

  const lowStock = catalog.filter(
    (p) => p.stockRemaining <= p.stockMinimum,
  ).length;

  const activeZones = zones.filter((z) => z.isActive).length;
  const recentOrders = orders.slice(0, 5);
  const recentJournal = journal.slice(0, 5);
  const menuActivations = journal.filter((e) => e.action === "menu_activated");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary">
          Tableau de bord
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Chaque chiffre est cliquable — accès direct aux listes filtrées.
        </p>
        <div className="mt-4">
          <AdminSeedButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          href="/admin/commandes"
          label="Commandes aujourd'hui"
          value={String(ordersToday.length)}
          hint="Créneaux du jour"
        />
        <StatCard
          href="/admin/commandes"
          label="Commandes totales"
          value={String(orders.length)}
          hint="Toutes les commandes"
        />
        <StatCard
          href="/admin/produits"
          label="Stock faible"
          value={String(lowStock)}
          hint="Sous le minimum"
        />
        <StatCard
          href="/admin/parametres/livraison"
          label="Zones actives"
          value={`${activeZones} / ${zones.length}`}
          hint="Livraison"
        />
      </div>

      {(activeMenu || nextMenu) && (
        <section className="rounded-2xl border border-accent/40 bg-accent/10 p-5">
          <h2 className="font-display text-lg font-semibold text-primary">
            Menus journaliers
          </h2>
          <div className="mt-3 flex flex-wrap gap-4 font-body text-sm">
            {activeMenu && (
              <p>
                <span className="font-medium text-emerald-800">Actif</span>
                {" — "}
                {activeMenu.productIds.length} produits ·{" "}
                {MENU_STATUS_LABELS.active}
              </p>
            )}
            {nextMenu && (
              <p className="text-muted-foreground">
                Prochain :{" "}
                {new Date(nextMenu.activateAt).toLocaleString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
          {menuActivations[0] && (
            <p className="mt-2 font-body text-xs text-muted-foreground">
              Dernière activation auto : {menuActivations[0].summary}
            </p>
          )}
          <Link
            href="/admin/menus"
            className="mt-3 inline-flex font-body text-sm font-semibold text-primary hover:underline"
          >
            Gérer les menus →
          </Link>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <QuickLink
          href="/admin/commandes"
          icon={Package}
          title="Commandes"
          desc="Statut en un clic"
        />
        <QuickLink
          href="/admin/menus"
          icon={Calendar}
          title="Menus"
          desc="Programmer demain"
        />
        <QuickLink
          href="/admin/produits"
          icon={IceCreamCone}
          title="Produits"
          desc="Prix & dispo"
        />
        <QuickLink
          href="/admin/parametres/livraison"
          icon={Truck}
          title="Livraison"
          desc="Zones & horaires"
        />
        <QuickLink
          href="/admin/assistant"
          icon={Bot}
          title="Assistant IA"
          desc="Actions rapides"
        />
        <QuickLink
          href="/admin/donnees"
          icon={Sparkles}
          title="Données brutes"
          desc="JSON serveur"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-primary">
            Dernières commandes
          </h2>
          {recentOrders.length === 0 ? (
            <div className="mt-4 rounded-xl bg-bg px-4 py-6 text-center">
              <p className="font-body text-sm text-muted-foreground">
                Aucune commande pour l&apos;instant.
              </p>
              <Link
                href="/admin/commandes"
                className="mt-2 inline-block font-body text-sm font-semibold text-primary hover:underline"
              >
                Voir les commandes →
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-bg px-3 py-2 font-body text-sm"
                >
                  <div>
                    <p className="font-medium text-text">{order.id}</p>
                    <p className="text-muted-foreground">
                      {order.client.firstName} {order.client.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(order.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {ORDER_STATUS_LABELS[order.status]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-primary">
            Journal admin
          </h2>
          {recentJournal.length === 0 ? (
            <p className="mt-4 font-body text-sm text-muted-foreground">
              Les actions (menus, assistant…) apparaîtront ici.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentJournal.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl bg-bg px-3 py-2 font-body text-sm"
                >
                  <p className="text-text">{entry.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.adminName}
                    {entry.source === "ai_assistant" ? " · assistant IA" : ""}
                    {" · "}
                    {new Date(entry.createdAt).toLocaleString("fr-FR")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border bg-white p-5 transition-colors hover:border-primary/30 hover:bg-bg"
      title={`Voir : ${label}`}
    >
      <p className="font-body text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-primary">
        {value}
      </p>
      <p className="mt-1 font-body text-xs text-muted-foreground">{hint}</p>
    </Link>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof Package;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 transition-colors hover:border-primary/30 hover:bg-bg"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <p className="font-display font-semibold text-primary">{title}</p>
        <p className="mt-0.5 font-body text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
