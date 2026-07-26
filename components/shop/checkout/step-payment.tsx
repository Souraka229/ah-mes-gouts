"use client";

import { CreditCard, Loader2, RefreshCw, Smartphone, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCheckoutTotal } from "@/components/shop/checkout/checkout-summary";
import { useCheckoutStore } from "@/lib/checkout-store";
import { useCartStore } from "@/lib/cart-store";
import { getLineUnitPrice } from "@/lib/cart-utils";
import { getOrCreateDeviceKey } from "@/lib/crm/device-id";
import {
  generateOrderId,
  saveOrder,
} from "@/lib/order-storage";
import {
  encodeOrderFlags,
  PACKAGING_LABELS,
  type PackagingChoice,
} from "@/lib/orders/order-flags";
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

type PaymentUiState = "idle" | "loading" | "pending" | "error";

async function persistOrderOnServer(
  order: SavedOrder,
  idempotencyKey: string,
): Promise<{
  subtotal: number;
  deliveryFee: number;
  total: number;
}> {
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

  const payload = (await response.json()) as {
    subtotal: number;
    deliveryFee: number;
    total: number;
  };
  return payload;
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
  const [demoPayments, setDemoPayments] = useState(false);
  // Emballage : proposé seulement si plusieurs articles (sinon sans objet).
  const totalUnits = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const showPackaging = totalUnits > 1;
  const [packaging, setPackaging] = useState<PackagingChoice>("together");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const payingRef = useRef(false);
  const idempotencyRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/payments/config")
      .then((res) => res.json())
      .then((data: { provider?: string }) => {
        if (!cancelled) setDemoPayments(data.provider === "mock");
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const finishSuccess = (orderId: string) => {
    stopPolling();
    clearCart();
    resetCheckout();
    payingRef.current = false;
    idempotencyRef.current = null;
    router.push(`/commande/confirmation?orderId=${orderId}`);
  };

  const pollPaymentStatus = (
    orderId: string,
    reference: string,
    deviceKey: string | null,
  ) => {
    stopPolling();
    const delays = [3000, 5000, 8000];
    const maxAttempts = 15;
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        stopPolling();
        setUiState("error");
        setErrorMessage(
          "Délai dépassé. Si vous avez validé sur votre téléphone, contactez-nous avec votre numéro de commande.",
        );
        payingRef.current = false;
        return;
      }

      try {
        const response = await fetch(
          `/api/payments/initiate?reference=${encodeURIComponent(reference)}&orderId=${encodeURIComponent(orderId)}`,
          {
            headers: deviceKey ? { "x-amg-device-key": deviceKey } : {},
          },
        );
        const payload = (await response.json()) as {
          status?: string;
          error?: string;
        };

        if (payload.status === "SUCCESS") {
          finishSuccess(orderId);
          return;
        }
        if (payload.status === "FAILED") {
          stopPolling();
          setUiState("error");
          setErrorMessage(
            payload.error ||
              "Paiement refusé ou annulé. Réessayez ou changez de méthode.",
          );
          payingRef.current = false;
          return;
        }
      } catch {
        /* réseau instable — on continue */
      }

      const delay = delays[Math.min(attempts - 1, delays.length - 1)]!;
      pollTimerRef.current = setTimeout(() => void tick(), delay);
    };

    pollTimerRef.current = setTimeout(() => void tick(), delays[0]!);
  };

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
      setUiState("error");
      setErrorMessage(
        "Impossible de vérifier le stock. Vérifiez votre connexion et réessayez.",
      );
      return;
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
    setInfoMessage(null);
    setPendingMessage(null);
    stopPolling();

    const orderId = generateOrderId();
    if (!idempotencyRef.current) {
      idempotencyRef.current = `pay-${orderId}-${crypto.randomUUID()}`;
    }

    const zone = zoneId;
    const encodedMessage = encodeOrderFlags({
      note: client.message,
      packaging: showPackaging ? packaging : null,
    });

    const buildOrder = (
      slot: NonNullable<typeof scheduledSlot>,
    ): SavedOrder => ({
      id: orderId,
      createdAt: new Date().toISOString(),
      status: "recue",
      mode,
      fulfillmentType: mode,
      zoneId: mode === "delivery" ? zone : null,
      deliveryZoneId: mode === "delivery" ? zone : null,
      zoneName: totals.zoneName,
      scheduledSlotStart: slot.start,
      scheduledSlotEnd: slot.end,
      deliveryFee: totals.deliveryFee,
      client: isGift
        ? {
            ...client,
            address: "",
            landmark: "",
            message: encodeOrderFlags({
              packaging: showPackaging ? packaging : null,
            }),
          }
        : { ...client, message: encodedMessage },
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
    });

    let activeSlot = scheduledSlot;
    let order = buildOrder(activeSlot);
    let persisted = false;

    for (let attempt = 0; attempt < 2 && !persisted; attempt++) {
      try {
        const key: string =
          attempt === 0
            ? (idempotencyRef.current ?? `pay-${orderId}-${crypto.randomUUID()}`)
            : `pay-${orderId}-slot-${crypto.randomUUID()}`;
        idempotencyRef.current = key;
        const serverTotals = await persistOrderOnServer(order, key);
        saveOrder({
          ...order,
          subtotal: serverTotals.subtotal,
          deliveryFee: serverTotals.deliveryFee,
          total: serverTotals.total,
        });
        persisted = true;
      } catch (error) {
        const err = error as Error & {
          nextSlot?: {
            start: string;
            end: string;
            slotKey: string;
            label?: string;
          };
        };

        // Course rare : bascule silencieuse sur le prochain créneau libre, sans alarmer.
        if (attempt === 0 && err.nextSlot) {
          activeSlot = {
            start: err.nextSlot.start,
            end: err.nextSlot.end,
            slotKey: err.nextSlot.slotKey,
          };
          setScheduledSlot(activeSlot);
          order = buildOrder(activeSlot);
          setInfoMessage(
            err.nextSlot.label
              ? `Créneau ajusté : ${err.nextSlot.label}.`
              : "Créneau ajusté automatiquement.",
          );
          continue;
        }

        const isSlotConflict =
          err.message === "SLOT_FULL" ||
          err.message === "SLOT_UNAVAILABLE" ||
          Boolean(err.nextSlot);

        if (isSlotConflict) {
          // Plus de créneau libre : retour calmement à la sélection.
          setUiState("idle");
          payingRef.current = false;
          setScheduledSlot(null);
          setInfoMessage(null);
          setErrorMessage(null);
          setStep("commande");
          return;
        }

        setUiState("error");
        payingRef.current = false;
        setErrorMessage(
          err.message ||
            "Impossible d'enregistrer la commande. Vérifiez votre connexion.",
        );
        return;
      }
    }

    if (!persisted) {
      setUiState("idle");
      payingRef.current = false;
      setStep("commande");
      return;
    }

    const deviceKey = getOrCreateDeviceKey();
    let paymentResponse: Response;
    try {
      paymentResponse = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(deviceKey ? { "x-amg-device-key": deviceKey } : {}),
        },
        body: JSON.stringify({
          orderId,
          method: paymentMethod,
        }),
      });
    } catch {
      setUiState("error");
      setErrorMessage("Connexion interrompue pendant le paiement.");
      payingRef.current = false;
      return;
    }

    const paymentPayload = (await paymentResponse.json().catch(() => null)) as {
      status?: string;
      error?: string;
      message?: string;
      reference?: string;
      paymentUrl?: string;
      orderId?: string;
    } | null;

    if (!paymentResponse.ok || !paymentPayload) {
      setUiState("error");
      setErrorMessage(
        paymentPayload?.error || "Le paiement n'a pas pu être lancé.",
      );
      payingRef.current = false;
      return;
    }

    if (paymentPayload.status === "SUCCESS") {
      finishSuccess(orderId);
      return;
    }

    if (paymentPayload.status === "PENDING" && paymentPayload.reference) {
      if (paymentPayload.paymentUrl) {
        window.location.href = paymentPayload.paymentUrl;
        return;
      }

      setUiState("pending");
      setPendingMessage(
        paymentPayload.message ||
          "Validez le paiement sur votre téléphone (invite USSD), puis patientez…",
      );
      pollPaymentStatus(orderId, paymentPayload.reference, deviceKey);
      return;
    }

    setUiState("error");
    setErrorMessage(
      paymentPayload.error || "Paiement refusé. Réessayez ou changez de méthode.",
    );
    payingRef.current = false;
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

      {demoPayments && (
        <div className="rounded-2xl border border-accent/40 bg-accent/15 px-4 py-3 font-body text-sm text-text">
          <strong>Mode démo</strong> — le paiement est simulé (pas de débit réel).
          FeexPay sera branché ensuite.
        </div>
      )}

      {infoMessage && (
        <div
          role="status"
          className="rounded-2xl border border-secondary bg-secondary/20 px-4 py-3 font-body text-sm text-text"
        >
          {infoMessage}
        </div>
      )}

      {isGift && (
        <div className="rounded-2xl border border-secondary bg-secondary/20 px-4 py-3 font-body text-sm text-text">
          Cadeau pour <strong>{gift.recipientName}</strong>
          {!gift.senderVisible && " — mode anonyme activé"}
        </div>
      )}

      {showPackaging && (
        <div className="space-y-3">
          <p className="font-body text-sm font-medium text-primary">
            Comment emballer votre commande ?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["together", "separate"] as const).map((choice) => {
              const selected = packaging === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPackaging(choice)}
                  className={cn(
                    "min-h-11 cursor-pointer rounded-2xl border px-4 py-3 text-left font-body text-sm transition-all duration-[250ms]",
                    selected
                      ? "border-primary bg-primary/5 font-semibold text-primary shadow-md"
                      : "border-border bg-card text-text hover:border-primary/40",
                  )}
                >
                  {PACKAGING_LABELS[choice]}
                  <span className="mt-0.5 block font-body text-xs font-normal text-muted-foreground">
                    {choice === "together"
                      ? "Tout dans un même emballage."
                      : "Chaque article emballé à part."}
                  </span>
                </button>
              );
            })}
          </div>
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
                setInfoMessage(null);
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

      {uiState === "pending" && pendingMessage && (
        <div
          role="status"
          className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 font-body text-sm text-primary"
        >
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />
            <p>{pendingMessage}</p>
          </div>
        </div>
      )}

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 cursor-pointer gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => {
              setUiState("idle");
              setErrorMessage(null);
            }}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Réessayer
          </Button>
        </div>
      )}

      <Button
        className="h-11 w-full cursor-pointer bg-accent text-text hover:bg-accent/90 sm:w-auto sm:min-w-64"
        disabled={!paymentMethod || uiState === "loading" || uiState === "pending" || !scheduledSlot}
        onClick={handlePay}
      >
        {uiState === "loading" || uiState === "pending" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {uiState === "pending"
              ? "En attente de validation…"
              : "Traitement en cours..."}
          </>
        ) : (
          "Confirmer et payer"
        )}
      </Button>
    </div>
  );
}
