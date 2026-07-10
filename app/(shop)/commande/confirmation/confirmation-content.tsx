"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Gift } from "lucide-react";
import { motion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import { formatFulfillmentSummary } from "@/lib/delivery/fulfillment-summary";
import { getOrderById } from "@/lib/order-storage";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, type SavedOrder } from "@/types/order";

export default function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<SavedOrder | null>(null);

  useEffect(() => {
    if (!orderId) return;
    setOrder(getOrderById(orderId) ?? null);
  }, [orderId]);

  if (!orderId) {
    return <EmptyState message="Aucune commande à afficher." />;
  }

  if (!order) {
    return (
      <EmptyState message="Commande introuvable. Vérifiez votre numéro de suivi." />
    );
  }

  const isGift = order.isGift;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={cn(
          "mx-auto flex size-20 items-center justify-center rounded-full",
          isGift ? "bg-secondary/50 text-primary" : "bg-success/20 text-success",
        )}
      >
        {isGift ? (
          <Gift className="size-10" aria-hidden />
        ) : (
          <CheckCircle2 className="size-10" aria-hidden />
        )}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mt-6 font-display text-4xl font-semibold text-primary"
      >
        {isGift ? "Cadeau confirmé !" : "Commande confirmée !"}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="mt-3 font-body text-muted-foreground"
      >
        {isGift
          ? `Merci ${order.client.firstName}. Votre surprise pour ${order.gift?.recipientName ?? "votre proche"} est en préparation.`
          : `Merci ${order.client.firstName}. Votre commande est en cours de préparation.`}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mt-8 rounded-2xl border border-border bg-card p-6 text-left"
      >
        <p className="font-body text-sm text-muted-foreground">
          Numéro de commande
        </p>
        <p className="mt-1 font-display text-2xl font-semibold text-primary">
          {order.id}
        </p>
        <dl className="mt-4 space-y-2 font-body text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total payé</dt>
            <dd className="font-semibold">{formatPrice(order.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Paiement</dt>
            <dd>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</dd>
          </div>
          {formatFulfillmentSummary(order) && (
            <div className="border-t border-border pt-3">
              <dt className="text-muted-foreground">Créneau</dt>
              <dd className="mt-1 font-medium text-text">
                {formatFulfillmentSummary(order)}
              </dd>
            </div>
          )}
        </dl>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
      >
        <Link
          href={`/suivi/${order.id}`}
          className={cn(
            buttonVariants(),
            "cursor-pointer bg-accent text-text hover:bg-accent/90",
          )}
        >
          Suivre ma commande
        </Link>
        <Link
          href="/catalogue"
          className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}
        >
          Continuer mes achats
        </Link>
      </motion.div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-body text-muted-foreground">{message}</p>
      <Link
        href="/catalogue"
        className={cn(buttonVariants(), "mt-6 inline-flex cursor-pointer")}
      >
        Retour au catalogue
      </Link>
    </div>
  );
}
