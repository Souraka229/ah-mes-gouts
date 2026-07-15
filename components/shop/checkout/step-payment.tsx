"use client";

import { CreditCard, Loader2, RefreshCw, Smartphone, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCheckoutTotal } from "@/components/shop/checkout/checkout-summary";
import { useCheckoutStore } from "@/lib/checkout-store";
import { useCartStore } from "@/lib/cart-store";
import { getLineUnitPrice } from "@/lib/cart-utils";
import { getOrCreateDeviceKey } from "@/lib/crm/device-id";
import { trackActivity } from "@/lib/crm/track";
import { processPayment } from "@/lib/payments/process-payment";
import {
  generateOrderId,
  saveOrder,
} from "@/lib/order-storage";
import { validateCartStock, validateCartStockWithCatalog } from "@/lib/validate-cart-stock";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type SavedOrder,
  type ScheduledSlotSelection,
} from "@/types/order";

const paymentMethods: {
  id: PaymentMethod;
  label: string;
  description: string;
  accentClass: string;
  icon: typeof Smartphone;
}[] = [
  {
    id: "mtn_momo",
    label: PAYMENT_METHOD_LABELS.mtn_momo,
    description: "Paiement via MTN Mobile Money",
    accentClass: "border-accent bg-accent/10",
    icon: Smartphone,
  },
  {
    id: "moov_money",
    label: PAYMENT_METHOD_LABELS.moov_money,
    description: "Paiement via Moov Money",
    accentClass: "border-primary bg-primary/5",
    icon: Smartphone,
  },
  {
    id: "celtiis_cash",
    label: PAYMENT_METHOD_LABELS.celtiis_cash,
    description: "Paiement via Celtiis Cash",
    accentClass: "border-secondary bg-secondary/30",
    icon: Smartphone,
  },
  {
    id: "card",
    label: PAYMENT_METHOD_LABELS.card,
    description: "Visa / Mastercard",
    accentClass: "border-border bg-card",
    icon: CreditCard,
  },
];

type PaymentUiState = "idle" | "loading" | "error";

async function persistOrderOnServer(
  order: SavedOrder,
  idempotencyKey: string,
): Promise<void> {
  const deviceKey = getOrCreateDeviceKey();
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      ...(deviceKey ? { "x-amg-device-key": deviceKey } : {}),
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      nextSlot?: ScheduledSlotSelection & { label?: string; start: string; end: string; slotKey: string };
    } | null;

    const err = new Error(payload?.error ?? "Échec de synchronisation serveur") as Error & {
      nextSlot?: { start: string; end: string; slotKey: string; label?: string };
    };
    if (payload?.nextSlot) {
      err.nextSlot = payload.nextSlot;
    }
    throw err;
  }
}

export function StepPayment() {
  const router = useRouter();
  const paymentMethod = useCheckoutStore((state) => state.paymentMethod);
  const setPaymentMethod = useCheckoutStore((state) => state.setPaymentMethod);
  const mode = useCheckoutStore((state) => state.mode);
  const zoneId = useCheckoutStore((state) => state.zoneId);
  const scheduledSlot = useCheckoutStore((state) => state.scheduledSlot);
  const setScheduledSlot = useCheckoutStore((state) => state.setScheduledSlot);
  const setStep = useCheckoutStore((state) => state.setStep);
  const client = useCheckoutStore((state) => state.client);
  const isGift = useCheckoutStore((state) => state.isGift);
  const gift = useCheckoutStore((state) => state.gift);
  const resetCheckout = useCheckoutStore((state) => state.resetCheckout);
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const totals = useCheckoutTotal();

  const [uiState, setUiState] = useState<PaymentUiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestedSlot, setSuggestedSlot] = useState<{
    start: string;
    end: string;
    slotKey: string;
    label?: string;
  } | null>(null);
  const payingRef = useRef(false);
  const idempotencyRef = useRef<string | null>(null);

  const handlePay = async () => {
    if (!paymentMethod || !mode || cartItems.length === 0 || !scheduledSlot) return;
    if (payingRef.current || uiState === "loading") return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setUiState("error");
      setErrorMessage(
        "Connexion perdue. Vérifiez votre réseau mobile ou Wi-Fi, puis réessayez.",
      );
      return;
    }

    let stockIssues: { name: string; message: string }[] = [];
    try {
      const stockResponse = await fetch("/api/cart/validate-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            slug: item.slug,
            name: item.name,
            quantity: item.quantity,
          })),
        }),
      });
      if (stockResponse.ok) {
        const payload = (await stockResponse.json()) as {
          issues: { name: string; message: string }[];
        };
        stockIssues = payload.issues;
      }
    } catch {
      stockIssues = validateCartStock(cartItems);
    }

    if (stockIssues.length > 0) {
      setUiState("error");
      setErrorMessage(
        stockIssues
          .map((issue) => `${issue.name} : ${issue.message}`)
          .join(" — "),
      );
      return;
    }

    payingRef.current = true;
    setUiState("loading");
    setErrorMessage(null);

    const orderId = generateOrderId();
    if (!idempotencyRef.current) {
      idempotencyRef.current = `pay-${orderId}-${crypto.randomUUID()}`;
    }

    const result = await processPayment({
      method: paymentMethod,
      amount: totals.total,
      orderId,
      customerPhone: client.phone,
    });

    if (result.status === "error") {
      setUiState("error");
      setErrorMessage(result.message);
      payingRef.current = false;
      return;
    }

    const zone = zoneId;

    const order: SavedOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      status: "paiement_confirme",
      mode,
      fulfillmentType: mode,
      zoneId: mode === "delivery" ? zone : null,
      deliveryZoneId: mode === "delivery" ? zone : null,
      zoneName: totals.zoneName,
      scheduledSlotStart: scheduledSlot.start,
      scheduledSlotEnd: scheduledSlot.end,
      deliveryFee: totals.deliveryFee,
      client: isGift
        ? { ...client, address: "", landmark: "", message: "" }
        : client,
      isGift,
      gift: isGift ? gift : null,
      paymentMethod,
      items: cartItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: getLineUnitPrice(item),
        supplements: item.supplements.map((s) => s.name),
        slug: item.slug,
      })),
      subtotal: totals.subtotal,
      total: totals.total,
    };

    saveOrder(order);

    try {
      await persistOrderOnServer(order, idempotencyRef.current);
    } catch (error) {
      setUiState("error");
      payingRef.current = false;
      const err = error as Error & {
        nextSlot?: { start: string; end: string; slotKey: string; label?: string };
      };
      if (err.nextSlot) {
        setSuggestedSlot(err.nextSlot);
        setErrorMessage(
          `${err.message} Un créneau alternatif est proposé ci-dessous.`,
        );
      } else {
        setErrorMessage(
          err.message ||
            "Impossible de finaliser la commande. Vérifiez votre connexion et réessayez.",
        );
      }
      return;
    }

    clearCart();
    resetCheckout();
    payingRef.current = false;
    idempotencyRef.current = null;
    router.push(`/commande/confirmation?orderId=${orderId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
          Paiement sécurisé
        </h1>
        <p className="mt-2 font-body text-muted-foreground">
          {isGift
            ? "Finalisez votre cadeau — le destinataire sera notifié discrètement."
            : "Choisissez votre méthode de paiement préférée."}
        </p>
      </div>

      {isGift && (
        <div className="rounded-2xl border border-secondary bg-secondary/20 px-4 py-3 font-body text-sm text-text">
          Cadeau pour <strong>{gift.recipientName}</strong>
          {!gift.senderVisible && " — mode anonyme activé"}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const selected = paymentMethod === method.id;

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => {
                setPaymentMethod(method.id);
                setUiState("idle");
                setErrorMessage(null);
              }}
              className={cn(
                "flex min-h-11 min-w-11 cursor-pointer items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-[250ms]",
                selected
                  ? cn(method.accentClass, "shadow-md ring-2 ring-primary/20")
                  : "border-border bg-card hover:border-primary/30",
              )}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                <Icon className="size-5" aria-hidden />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-primary">
                  {method.label}
                </p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  {method.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {uiState === "error" && errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-4 font-body text-sm text-destructive"
        >
          <div className="flex items-start gap-3">
            {errorMessage.includes("Connexion") ? (
              <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : null}
            <p>{errorMessage}</p>
          </div>
          {suggestedSlot && (
            <Button
              type="button"
              size="sm"
              className="mt-3 cursor-pointer bg-accent text-text hover:bg-accent/90"
              onClick={() => {
                setScheduledSlot({
                  start: suggestedSlot.start,
                  end: suggestedSlot.end,
                  slotKey: suggestedSlot.slotKey,
                });
                setSuggestedSlot(null);
                setErrorMessage(null);
                setUiState("idle");
                setStep("schedule");
              }}
            >
              Choisir le créneau suivant
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 cursor-pointer gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setUiState("idle");
              setErrorMessage(null);
              setSuggestedSlot(null);
            }}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Réessayer
          </Button>
        </div>
      )}

      <Button
        className="h-11 w-full cursor-pointer bg-accent text-text hover:bg-accent/90 sm:w-auto sm:min-w-64"
        disabled={!paymentMethod || uiState === "loading" || !scheduledSlot}
        onClick={handlePay}
      >
        {uiState === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Traitement en cours...
          </>
        ) : (
          "Confirmer et payer"
        )}
      </Button>
    </div>
  );
}
