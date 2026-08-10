import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Clock3,
  IceCreamCone,
  Info,
  Package,
} from "lucide-react";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { AdminSeedButton } from "@/components/admin/admin-seed-button";
import {
  buildAdminKpis,
  KPI_PERIOD_LABELS,
  type AdminAlert,
  type AdminKpiPeriod,
} from "@/lib/admin/kpis";
import { formatPrice } from "@/lib/format";
import { isDevAdminOpen } from "@/lib/server/admin-auth";
import { getAllServerOrders } from "@/lib/server/order-repository";
import { getShopProductsFromActiveMenu } from "@/lib/server/menu-repository";
import { getVisitStats } from "@/lib/server/site-visits";
import { ORDER_STATUS_LABELS, RECEPTION_MODE_LABELS } from "@/types/order";
import { cn } from "@/lib/utils";

type AdminDashboardProps = {
  period?: AdminKpiPeriod;
};

export async function AdminDashboard({
  period = "today",
}: AdminDashboardProps) {
  const [orders, menuProducts, visits] = await Promise.all([
    getAllServerOrders(),
    getShopProductsFromActiveMenu(),
    getVisitStats(),
  ]);
  const kpis = buildAdminKpis(orders, { menuProducts, period });
  const showSeedButton = isDevAdminOpen();
  const masterIsAttention = kpis.attentionCount > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-body text-[11px] font-semibold tracking-[0.28em] text-muted-foreground uppercase">
            Cockpit
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
            {KPI_PERIOD_LABELS[period]}
          </h1>
          {period === "today" && (
            <p className="mt-1 font-body text-sm capitalize text-muted-foreground">
              {kpis.dateLabel}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showSeedButton && <AdminSeedButton />}
          <Link
            href="/admin/commandes?tab=nouvelles"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-body text-sm font-semibold text-white transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {kpis.nouvelles > 0
              ? `Traiter (${kpis.nouvelles})`
              : "Ouvrir les commandes"}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </header>

      <nav
        aria-label="Période analysée"
        className="flex w-fit gap-1 rounded-2xl border border-border bg-muted/30 p-1"
      >
        {(Object.keys(KPI_PERIOD_LABELS) as AdminKpiPeriod[]).map((p) => (
          <Link
            key={p}
            href={p === "today" ? "/admin/cockpit" : `/admin/cockpit?period=${p}`}
            className={cn(
              "min-h-9 cursor-pointer rounded-xl px-3 py-1.5 font-body text-sm font-medium transition-colors",
              p === period
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-text",
            )}
          >
            {KPI_PERIOD_LABELS[p]}
          </Link>
        ))}
      </nav>

      {/* Cadran maître + secondaires — pas 4 cartes clones */}
      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <article
          className={cn(
            "rounded-[24px] border bg-white p-6 sm:p-7",
            masterIsAttention
              ? "border-destructive/35 shadow-[0_12px_40px_rgba(180,74,74,0.08)]"
              : "border-border/80 shadow-[0_12px_40px_rgba(59,31,77,0.04)]",
          )}
        >
          <p className="font-body text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
            {masterIsAttention ? "À traiter maintenant" : "CA du jour"}
          </p>
          {masterIsAttention ? (
            <>
              <p className="mt-3 font-display text-5xl font-semibold tracking-tight text-primary tabular-nums sm:text-6xl">
                {kpis.attentionCount}
              </p>
              <p className="mt-2 font-body text-sm text-muted-foreground">
                alerte{kpis.attentionCount > 1 ? "s" : ""} ops · CA{" "}
                <span className="font-semibold text-primary tabular-nums">
                  {formatPrice(kpis.revenueToday)}
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 font-display text-5xl font-semibold tracking-tight text-primary tabular-nums sm:text-6xl">
                {formatPrice(kpis.revenueToday)}
              </p>
              <DeltaLine
                delta={kpis.comparedToYesterday.revenueDelta}
                comparisonLabel={kpis.comparisonLabel}
                money
              />
            </>
          )}
        </article>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <MiniKpi
            label="Commandes"
            value={String(kpis.ordersToday)}
            hint={
              kpis.nouvelles > 0
                ? `${kpis.nouvelles} nouvelles`
                : "File à jour"
            }
          />
          <MiniKpi
            label="Panier moyen"
            value={formatPrice(kpis.avgTicket)}
            hint="Actives"
          />
          <MiniKpi
            label="Visiteurs"
            value={String(visits.todayUnique)}
            hint={`${visits.todayViews} vues · ${kpis.boutiqueShare}% boutique`}
          />
          <MiniKpi
            label="Terminées"
            value={String(kpis.livrees)}
            hint={
              !kpis.comparisonLabel
                ? `${kpis.giftShare}% cadeaux`
                : kpis.comparedToYesterday.ordersDelta === 0
                  ? `${kpis.giftShare}% cadeaux · ${kpis.comparisonLabel} stable`
                  : `${kpis.giftShare}% cadeaux · ${kpis.comparedToYesterday.ordersDelta > 0 ? "+" : ""}${kpis.comparedToYesterday.ordersDelta} cmd ${kpis.comparisonLabel}`
            }
          />
        </div>
      </section>

      {/* Alertes */}
      {kpis.alerts.length > 0 && (
        <section aria-label="Alertes du jour" className="space-y-2">
          {kpis.alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </section>
      )}

      {/* Pipeline */}
      <section className="rounded-[24px] border border-border/80 bg-white p-5 shadow-[0_12px_40px_rgba(59,31,77,0.04)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-primary">
              Pipeline
            </h2>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Un tap = ouvrir la file filtrée
            </p>
          </div>
          <Link
            href="/admin/commandes"
            className="font-body text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Tableau →
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
          {kpis.pipeline.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className={cn(
                "rounded-2xl p-4 transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                step.tone,
              )}
            >
              <p className="font-body text-[10px] font-semibold tracking-[0.18em] uppercase opacity-80 sm:text-[11px]">
                {step.label}
              </p>
              <p className="mt-2 font-body text-3xl font-semibold tabular-nums">
                {step.count}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[24px] border border-border/80 bg-white p-5 shadow-[0_12px_40px_rgba(59,31,77,0.04)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-primary">
              Dernières commandes
            </h2>
            <Link
              href="/admin/commandes"
              className="font-body text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Tout voir
            </Link>
          </div>

          {kpis.recentOrders.length === 0 ? (
            <AdminEmptyState
              className="mt-6"
              variant="calm"
              title="Journée calme"
              description="Les nouvelles commandes apparaîtront ici dès qu&apos;un client valide."
            />
          ) : (
            <ul className="mt-4 divide-y divide-border/70">
              {kpis.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/commandes?focus=${order.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-bg/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm font-semibold text-text">
                        {order.client.firstName} {order.client.lastName}
                      </p>
                      <p className="mt-0.5 font-body text-xs text-muted-foreground">
                        {ORDER_STATUS_LABELS[order.status]}
                        {" · "}
                        {
                          RECEPTION_MODE_LABELS[
                            order.fulfillmentType ?? order.mode
                          ]
                        }
                      </p>
                    </div>
                    <p className="shrink-0 font-body text-sm font-semibold text-primary tabular-nums">
                      {formatPrice(order.total)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2.5">
          <h2 className="px-1 font-display text-xl font-semibold text-primary">
            Accès rapides
          </h2>
          <QuickAction
            href="/admin/commandes?tab=nouvelles"
            icon={Package}
            title="Commandes"
            desc="Avancer les statuts"
            hot={kpis.nouvelles > 0}
            badge={kpis.nouvelles > 0 ? String(kpis.nouvelles) : undefined}
          />
          <QuickAction
            href="/admin/menus"
            icon={Calendar}
            title="Menu du jour"
            desc="86 / activer / programmer"
          />
          <QuickAction
            href="/admin/produits"
            icon={IceCreamCone}
            title="Produits"
            desc="Prix, stock, photos"
          />
        </section>
      </div>
    </div>
  );
}

function DeltaLine({
  delta,
  money,
  comparisonLabel,
}: {
  delta: number;
  money?: boolean;
  comparisonLabel: string | null;
}) {
  const positive = delta > 0;
  const negative = delta < 0;

  if (!comparisonLabel) {
    return (
      <p className="mt-2 font-body text-xs font-medium text-muted-foreground">
        Cumul depuis la création
      </p>
    );
  }

  return (
    <p
      className={cn(
        "mt-2 inline-flex items-center gap-1 font-body text-xs font-medium",
        positive && "text-success",
        negative && "text-destructive",
        !positive && !negative && "text-muted-foreground",
      )}
    >
      {positive ? (
        <ArrowUpRight className="size-3.5" aria-hidden />
      ) : negative ? (
        <ArrowDownRight className="size-3.5" aria-hidden />
      ) : null}
      {delta === 0
        ? `Stable ${comparisonLabel}`
        : `${positive ? "+" : ""}${money ? formatPrice(delta) : delta} ${comparisonLabel}`}
    </p>
  );
}

function MiniKpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-[20px] border border-border/80 bg-white p-4 shadow-[0_8px_24px_rgba(59,31,77,0.03)]">
      <p className="font-body text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-body text-2xl font-semibold text-primary tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-body text-xs text-muted-foreground">{hint}</p>
    </article>
  );
}

function AlertRow({ alert }: { alert: AdminAlert }) {
  const Icon =
    alert.tone === "urgent"
      ? AlertTriangle
      : alert.tone === "action"
        ? Clock3
        : Info;

  return (
    <Link
      href={alert.href}
      className={cn(
        "flex min-h-12 items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
        alert.tone === "urgent" &&
          "border-destructive/30 bg-destructive/5 hover:bg-destructive/10",
        alert.tone === "action" &&
          "border-accent/40 bg-accent/10 hover:bg-accent/15",
        alert.tone === "info" && "border-ops/25 bg-ops/5 hover:bg-ops/10",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          alert.tone === "urgent" && "text-destructive",
          alert.tone === "action" && "text-text",
          alert.tone === "info" && "text-ops",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-body text-sm font-semibold text-text">
          {alert.title}
        </p>
        <p className="mt-0.5 font-body text-xs text-muted-foreground">
          {alert.detail}
        </p>
      </div>
      <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
  hot,
  badge,
}: {
  href: string;
  icon: typeof Package;
  title: string;
  desc: string;
  hot?: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-3 rounded-[18px] border bg-white p-3.5 transition-colors hover:border-primary/25",
        hot ? "border-accent/50" : "border-border/80",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          hot ? "bg-accent text-accent-foreground" : "bg-primary/8 text-accent-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-body text-sm font-semibold text-primary">{title}</p>
          {badge && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 font-body text-[10px] font-bold text-primary-foreground tabular-nums">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 font-body text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight
        className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}
