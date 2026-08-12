"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Share2 } from "lucide-react";

import { GiftSurpriseCard } from "@/components/shop/checkout/gift-surprise-card";
import { OrderStepper } from "@/components/shop/checkout/order-stepper";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import { useOrderRealtime } from "@/lib/hooks/use-order-realtime";
import { buildTrackingUrl, getOrderById } from "@/lib/order-storage";
import { SITE_NAME } from "@/lib/seo/site";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type PublicTrackingOrder,
} from "@/types/order";

type TrackingPageProps = {
  orderId: string;
};

export function OrderTrackingView({ orderId }: TrackingPageProps) {
  const [order, setOrder] = useState<PublicTrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setLoading(true);
      setNotFound(false);

      try {
        const response = await fetch(buildTrackingUrl(orderId));
        if (response.ok) {
          const data = (await response.json()) as PublicTrackingOrder;
          if (!cancelled) setOrder(data);
          return;
        }
      } catch {
        // Fallback localStorage (commandes avant sync serveur)
      }

      const local = getOrderById(orderId);
      if (!local) {
        if (!cancelled) setNotFound(true);
        return;
      }

      const isAnonymousGift =
        local.isGift && local.gift !== null && !local.gift.senderVisible;

      if (!cancelled) {
        setOrder({
          id: local.id,
          createdAt: local.createdAt,
          status: local.status,
          mode: local.mode,
          zoneName: local.zoneName,
          deliveryFee: local.deliveryFee,
          isGift: local.isGift,
          isAnonymousGift,
          giftMessage: local.gift?.giftMessage ?? null,
          recipientName: local.gift?.recipientName ?? null,
          client: isAnonymousGift
            ? null
            : {
                firstName: local.client.firstName,
                lastName: local.client.lastName,
                phone: local.client.phone,
              },
          paymentMethod: local.paymentMethod,
          items: local.items,
          subtotal: local.subtotal,
          total: local.total,
          scheduledSlotStart: local.scheduledSlotStart ?? null,
          scheduledSlotEnd: local.scheduledSlotEnd ?? null,
          fulfillmentSummary: formatFulfillmentSummary(local),
        });
      }
    }

    void loadOrder().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useOrderRealtime({
    orderId,
    enabled: !notFound && !loading,
    onStatusChange: (row) => {
      setOrder((prev) =>
        prev ? { ...prev, status: row.status } : prev,
      );
    },
  });

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/suivi/${orderId}`;
  }, [orderId]);

  const whatsAppShareHref = useMemo(() => {
    const text = `🍨 Je viens de commander chez ${SITE_NAME} ! Suis ma commande en direct ici : ${shareUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }, [shareUrl]);

  const canShare = order && !order.isAnonymousGift;

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center font-body text-muted-foreground">
        Chargement du suivi...
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-primary">
          Commande introuvable
        </h1>
        <p className="mt-3 font-body text-muted-foreground">
          Vérifiez le numéro de commande ou contactez-nous.
        </p>
        <Link
          href="/catalogue"
          className={cn(buttonVariants(), "mt-6 inline-flex cursor-pointer")}
        >
          Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="mb-8">
        <p className="font-body text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Suivi de commande
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-primary">
          {order.id}
        </h1>
        <p className="mt-2 font-body text-muted-foreground">
          Statut actuel :{" "}
          <span className="font-medium text-text">
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </p>
      </div>

      {order.isAnonymousGift && (
        <div className="mb-8">
          <GiftSurpriseCard
            message={order.giftMessage}
            recipientName={order.recipientName}
          />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <OrderStepper currentStatus={order.status} />
      </div>

      {canShare && (
        <div className="mt-6">
          <Button
            render={
              <a
                href={whatsAppShareHref}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            variant="outline"
            size="lg"
            className="w-full cursor-pointer gap-2 sm:w-auto"
          >
            <Share2 className="size-4" aria-hidden />
            Partager avec mes amis
          </Button>
          <p className="mt-2 font-body text-xs text-muted-foreground">
            Envoie le lien de suivi sur WhatsApp — sans tes coordonnées complètes.
          </p>
        </div>
      )}
      {order.fulfillmentSummary && (
        <div className="mt-6 rounded-2xl border border-secondary bg-secondary/20 px-5 py-4 font-body text-sm text-text">
          {order.fulfillmentSummary}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {!order.isAnonymousGift && order.client && (
          <InfoCard title={order.isGift ? "Expéditeur" : "Client"}>
            <p>
              {order.client.firstName} {order.client.lastName}
            </p>
            <p>{order.client.phone}</p>
          </InfoCard>
        )}

        {order.isGift && !order.isAnonymousGift && order.recipientName && (
          <InfoCard title="Destinataire">
            <p>{order.recipientName}</p>
          </InfoCard>
        )}

        <InfoCard title="Paiement">
          <p>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
          <p className="font-semibold">{formatPrice(order.total)}</p>
        </InfoCard>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold text-primary">{title}</h2>
      <div className="mt-2 space-y-1 font-body text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
