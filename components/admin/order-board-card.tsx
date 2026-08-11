"use client";

import type { ComponentType } from "react";
import {
  Info,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Printer,
  Sunrise,
  Trash2,
  X,
} from "lucide-react";

import { isTomorrowAtShop } from "@/lib/business-date";
import { Button } from "@/components/ui/button";
import {
  STATUS_BORDER_CLASS,
  STATUS_DOT_CLASS,
  clientLabel,
  formatFulfillmentPlace,
  formatFulfillmentType,
  formatItemsSummary,
  formatScheduleLabel,
  getCakeMessage,
  getClientPhone,
  getDeliveryAddress,
  getOrderFlags,
  getPrimaryAction,
  hasReferenceNote,
  paymentLabel,
} from "@/lib/admin/order-board";
import { PACKAGING_LABELS } from "@/lib/orders/order-flags";
import { AlertTriangle, Package as PackageIcon } from "lucide-react";
import { printOrderReceipt } from "@/lib/admin/print-order-receipt";
import {
  buildWhatsAppShareUrl,
  getMapsSearchUrl,
} from "@/lib/driver/portal-links";
import { formatPrice } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type SavedOrder,
} from "@/types/order";
import { cn } from "@/lib/utils";

type DriverOption = {
  id: string;
  name: string;
};

type OrderBoardCardProps = {
  order: SavedOrder;
  drivers: DriverOption[];
  pendingDriverId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (
    orderId: string,
    status: OrderStatus,
    previous: OrderStatus,
  ) => void;
  onAssignDriver: (
    orderId: string,
    driverId: string | null,
    previous: string | null,
  ) => void;
  onPendingDriverChange: (orderId: string, driverId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
};

function formatRetraitDate(order: SavedOrder): string {
  if (!order.scheduledSlotStart) return "—";
  return new Date(order.scheduledSlotStart).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

function formatRetraitHeure(order: SavedOrder): string {
  if (!order.scheduledSlotStart) return "—";
  return new Date(order.scheduledSlotStart).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderBoardCard({
  order,
  drivers,
  pendingDriverId,
  expanded,
  onToggleExpand,
  onStatusChange,
  onAssignDriver,
  onPendingDriverChange,
  onEdit,
  onDelete,
}: OrderBoardCardProps) {
  const isForTomorrow =
    !!order.scheduledSlotStart && isTomorrowAtShop(order.scheduledSlotStart);
  const canDelete = order.status === "recue" || order.status === "annulee";
  const phone = getClientPhone(order);
  const address = getDeliveryAddress(order);
  const cakeMessage = getCakeMessage(order);
  const flags = getOrderFlags(order);
  const isDelivery =
    (order.fulfillmentType ?? order.mode) === "delivery";
  const primary = getPrimaryAction(order);
  const selectedDriverId = pendingDriverId || order.driverId || "";
  const canAssignDriver =
    isDelivery &&
    (order.status === "prete" || order.status === "en_livraison");
  const driverDirty =
    selectedDriverId !== "" && selectedDriverId !== (order.driverId ?? "");

  const whatsAppUrl = buildWhatsAppShareUrl(
    phone,
    `Bonjour, concernant votre commande ${order.id} chez Ah Mes Goûts.`,
  );

  const mapsUrl = getMapsSearchUrl(
    address,
    order.isGift
      ? order.gift?.recipientLandmark
      : order.client.landmark,
    order.zoneName,
  );

  return (
    <article
      className={cn(
        "rounded-2xl border border-border border-l-4 bg-card p-5 shadow-sm",
        STATUS_BORDER_CLASS[order.status],
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-1.5 size-3 shrink-0 rounded-full",
            STATUS_DOT_CLASS[order.status],
          )}
          title={ORDER_STATUS_LABELS[order.status]}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-primary">
              Commande {order.id}
            </h3>
            <span className="font-body text-xs text-muted-foreground">
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>

          {isForTomorrow && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-body text-xs font-semibold text-primary">
              <Sunrise className="size-3.5 shrink-0" aria-hidden />
              Pour demain — {formatRetraitDate(order)}
            </p>
          )}

          {flags.unreachableAt && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 font-body text-sm font-semibold text-red-700">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              Client injoignable par le livreur — à rappeler
            </div>
          )}

          <p className="mt-1 font-display text-xl font-semibold text-text">
            {clientLabel(order)}
          </p>
          <p className="mt-1 font-body text-base text-text">
            {formatItemsSummary(order)}
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-primary">
            {formatPrice(order.total)}
          </p>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            {isDelivery ? "Livraison" : "Boutique"} :{" "}
            <span className="font-medium text-text">
              {formatFulfillmentPlace(order)}
            </span>
          </p>
          <p className="font-body text-sm text-muted-foreground">
            {formatScheduleLabel(order)}
          </p>
          <p className="font-body text-sm text-muted-foreground">
            Paiement : {paymentLabel(order)}
          </p>
          {flags.packaging && (
            <p className="mt-1 inline-flex items-center gap-1.5 font-body text-sm font-medium text-primary">
              <PackageIcon className="size-4 shrink-0" aria-hidden />
              {PACKAGING_LABELS[flags.packaging]}
            </p>
          )}

          {expanded && (
            <div className="mt-4 space-y-1 rounded-xl bg-muted/30 p-4 font-body text-sm text-text">
              <p>
                <span className="text-muted-foreground">Type :</span>{" "}
                {formatFulfillmentType(order)}
              </p>
              <p>
                <span className="text-muted-foreground">Date de retrait :</span>{" "}
                {formatRetraitDate(order)}
              </p>
              <p>
                <span className="text-muted-foreground">Heure :</span>{" "}
                {formatRetraitHeure(order)}
              </p>
              {cakeMessage && (
                <p>
                  <span className="text-muted-foreground">
                    Message sur le gâteau :
                  </span>{" "}
                  {cakeMessage}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">
                  Photo de référence :
                </span>{" "}
                {hasReferenceNote(order) ? "Oui" : "Non"}
              </p>
              {order.driverName && (
                <p>
                  <span className="text-muted-foreground">Livreur :</span>{" "}
                  {order.driverName}
                </p>
              )}
            </div>
          )}

          {/* Action principale — un seul gros bouton pleine largeur.
              En livraison, il faut d'abord choisir le livreur (le bouton
              devient « Affecter » tant qu'aucun n'est assigné). */}
          <div className="mt-4 space-y-2">
            {canAssignDriver && (
              <select
                value={selectedDriverId}
                title="Choisir un livreur"
                aria-label="Choisir un livreur"
                className="min-h-12 w-full cursor-pointer rounded-xl border border-border bg-bg px-3 font-body text-base"
                onChange={(e) => onPendingDriverChange(order.id, e.target.value)}
              >
                <option value="">Choisir un livreur…</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {canAssignDriver && driverDirty ? (
              <Button
                type="button"
                className="min-h-14 w-full cursor-pointer text-base font-semibold"
                onClick={() =>
                  onAssignDriver(
                    order.id,
                    selectedDriverId || null,
                    order.driverId ?? null,
                  )
                }
              >
                Affecter à ce livreur
              </Button>
            ) : primary ? (
              <Button
                type="button"
                className="min-h-14 w-full cursor-pointer text-base font-semibold"
                disabled={
                  primary.nextStatus === "en_livraison" && !selectedDriverId
                }
                onClick={() =>
                  onStatusChange(order.id, primary.nextStatus, order.status)
                }
              >
                {primary.label}
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-1 border-t border-border pt-4">
            <ActionChip
              href={`tel:${phone.replace(/\s/g, "")}`}
              label="Appeler"
              icon={Phone}
            />
            <ActionChip
              href={whatsAppUrl}
              label="WhatsApp"
              icon={MessageCircle}
              external
            />
            <ActionChip
              href={mapsUrl}
              label="Adresse"
              icon={MapPin}
              external
            />
            <ActionChip
              label="Imprimer"
              icon={Printer}
              onClick={() => printOrderReceipt(order)}
            />
            <ActionChip
              label="Détails"
              icon={Info}
              onClick={onToggleExpand}
              active={expanded}
            />
            <ActionChip label="Éditer" icon={Pencil} onClick={onEdit} />
            {order.status !== "annulee" && order.status !== "livree" && (
              <ActionChip
                label="Annuler"
                icon={X}
                variant="danger"
                onClick={() => {
                  if (
                    window.confirm(
                      `Annuler la commande ${order.id} ?`,
                    )
                  ) {
                    onStatusChange(order.id, "annulee", order.status);
                  }
                }}
              />
            )}
            {canDelete && (
              <ActionChip
                label="Supprimer"
                icon={Trash2}
                variant="danger"
                onClick={onDelete}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

type ActionChipProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  external?: boolean;
  active?: boolean;
  variant?: "default" | "danger";
  onClick?: () => void;
};

function ActionChip({
  label,
  icon: Icon,
  href,
  external,
  active,
  variant = "default",
  onClick,
}: ActionChipProps) {
  const className = cn(
    "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 font-body text-xs font-medium transition-colors",
    variant === "danger"
      ? "border-red-200 text-red-700 hover:bg-red-50"
      : active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-bg text-text hover:border-primary/40",
  );

  if (href) {
    return (
      <a
        href={href}
        className={className}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
