"use client";

import type { ComponentType } from "react";
import {
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Printer,
  X,
} from "lucide-react";

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
  getPrimaryAction,
  hasReferenceNote,
  paymentLabel,
} from "@/lib/admin/order-board";
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
}: OrderBoardCardProps) {
  const phone = getClientPhone(order);
  const address = getDeliveryAddress(order);
  const cakeMessage = getCakeMessage(order);
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

          <p className="mt-1 font-display text-base font-medium text-text">
            {clientLabel(order)}
          </p>
          <p className="mt-1 font-body text-sm text-text">
            {formatItemsSummary(order)}
          </p>
          <p className="mt-2 font-body text-sm font-semibold text-text">
            Total : {formatPrice(order.total)}
          </p>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {isDelivery ? "Livraison" : "Retrait"} :{" "}
            {formatFulfillmentPlace(order)}
          </p>
          <p className="font-body text-sm text-muted-foreground">
            {formatScheduleLabel(order)}
          </p>
          <p className="font-body text-sm text-muted-foreground">
            Paiement : {paymentLabel(order)}
          </p>

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
              <p className="pt-2 text-xs text-muted-foreground">
                Pour modifier une commande, contactez le client ou recréez-la
                manuellement.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {primary && (
              <Button
                type="button"
                size="sm"
                className="min-h-10 cursor-pointer"
                onClick={() =>
                  onStatusChange(order.id, primary.nextStatus, order.status)
                }
              >
                {primary.label}
              </Button>
            )}

            {canAssignDriver && (
              <>
                <select
                  value={selectedDriverId}
                  title="Choisir un livreur"
                  className="min-h-10 cursor-pointer rounded-xl border border-border bg-bg px-3 font-body text-sm"
                  onChange={(e) =>
                    onPendingDriverChange(order.id, e.target.value)
                  }
                >
                  <option value="">Livreur…</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="min-h-10 cursor-pointer"
                  disabled={!driverDirty}
                  onClick={() =>
                    onAssignDriver(
                      order.id,
                      selectedDriverId || null,
                      order.driverId ?? null,
                    )
                  }
                >
                  Affecter
                </Button>
              </>
            )}

            {order.status === "prete" && !isDelivery && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="min-h-10 cursor-pointer"
                onClick={() =>
                  onStatusChange(order.id, "livree", order.status)
                }
              >
                Terminer
              </Button>
            )}
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
              label="Modifier"
              icon={Pencil}
              onClick={onToggleExpand}
              active={expanded}
            />
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
