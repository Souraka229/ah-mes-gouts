"use client";

import { CreditCard, Loader2, RefreshCw, Smartphone, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCheckoutTotal } from "@/components/shop/checkout/checkout-summary";
import type { AppError } from "@/lib/api/errors";
import { safeFetch } from "@/lib/api/safe-fetch";
import { useCheckoutStore } from "@/lib/checkout-store";
import { useCartStore } from "@/lib/cart-store";
import { getLineUnitPrice } from "@/lib/cart-utils";
import { getOrCreateDeviceKey } from "@/lib/crm/device-id";
import { saveOrder } from "@/lib/order-storage";
import {
  encodeOrderFlags,
  PACKAGING_LABELS,
  type PackagingChoice,
} from "@/lib/orders/order-flags";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  type NewOrderRequest,
  type PaymentMethod,
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

type PersistedOrder = {
  /** Généré par le serveur — le client ne choisit plus son numéro de commande. */
  orderId: string;
  /** Remis une seule fois : conservé localement pour consulter le suivi. */
  trackingToken?: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
};

/** Créneau de repli que le serveur propose quand celui choisi s'est rempli. */
type NextSlot = {
  start: string;
  end: string;
  slotKey: string;
  label?: string;
};

/** L'erreur d'enregistrement, enrichie du créneau de repli éventuel. */
type OrderPersistError = AppError & { nextSlot?: NextSlot };

/**
 * Lit `nextSlot` dans le corps d'erreur de la route commandes.
 *
 * Un conflit de créneau (409) renvoie `{ error: "SLOT_FULL", nextSlot }`.
 * `error.message` ne transporte que « SLOT_FULL » : sans ce détail, l'appelant
 * renverrait la cliente choisir un créneau au lieu de basculer en douceur.
 * On valide la forme plutôt que de faire confiance au contenu.
 */
function readNextSlot(body: unknown): NextSlot | null {
  if (!body || typeof body !== "object") return null;
  const candidate = (body as { nextSlot?: unknown }).nextSlot;
  if (!candidate || typeof candidate !== "object") return null;

  const { start, end, slotKey, label } = candidate as Record<string, unknown>;
  if (
    typeof start !== "string" ||
    typeof end !== "string" ||
    typeof slotKey !== "string"
  ) {
    return null;
  }

  return {
    start,
    end,
    slotKey,
    ...(typeof label === "string" ? { label } : {}),
  };
}

/**
 * Enregistre la commande côté serveur.
 *
 * Rejette toujours une `AppError` : le tunnel de paiement garde sa boucle de
 * réessai (`try/catch`) et son repli sur le créneau suivant, seule la lecture
 * de la réponse change.
 */
async function persistOrderOnServer(
  order: NewOrderRequest,
  idempotencyKey: string,
): Promise<PersistedOrder> {
  const deviceKey = getOrCreateDeviceKey();
  const result = await safeFetch<PersistedOrder>("/api/orders", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
      ...(deviceKey ? { "x-amg-device-key": deviceKey } : {}),
    },
    json: order,
    // Le serveur renvoie toujours l'identifiant : un corps vide signalerait une
    // panne, jamais une commande enregistrée.
    requireJson: true,
  });

  if (result.ok) return result.data;

  const failure = result.error as OrderPersistError;
  const nextSlot = readNextSlot(result.body);
  if (nextSlot) failure.nextSlot = nextSlot;
  throw failure;
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
    // Best-effort : sans configuration lisible, on masque simplement le
    // bandeau « mode démo » — on ne bloque pas le paiement pour autant.
    void safeFetch<{ provider?: string }>("/api/payments/config").then(
      (result) => {
        if (!cancelled && result.ok) {
          setDemoPayments(result.data?.provider === "mock");
        }
      },
    );
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

      // `orderId` n'est plus transmis : la commande est déduite serveur de la
      // tentative liée à cette référence.
      const result = await safeFetch<{ status?: string; error?: string }>(
        `/api/payments/initiate?reference=${encodeURIComponent(reference)}`,
        {
          headers: deviceKey ? { "x-amg-device-key": deviceKey } : {},
        },
      );

      // Panne réseau ou statut momentanément indisponible : on ne conclut rien
      // et on retente au tick suivant — c'est le serveur qui tranche.
      if (result.ok) {
        if (result.data?.status === "SUCCESS") {
          finishSuccess(orderId);
          return;
        }
        if (result.data?.status === "FAILED") {
          stopPolling();
          setUiState("error");
          setErrorMessage(
            result.data.error ||
              "Paiement refusé ou annulé. Réessayez ou changez de méthode.",
          );
          payingRef.current = false;
          return;
        }
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

    const stockResult = await safeFetch<{
      issues?: { name: string; message: string }[];
    }>("/api/cart/validate-stock", {
      method: "POST",
      json: {
        items: cartItems.map((item) => ({
          slug: item.slug,
          name: item.name,
          quantity: item.quantity,
        })),
      },
      // La route doit renvoyer la liste des problèmes : un corps vide est une
      // panne, pas un panier valide.
      requireJson: true,
    });

    // Une vérification impossible n'autorise JAMAIS le paiement : sans réponse
    // du serveur, on ne sait pas si le stock est là.
    if (!stockResult.ok) {
      setUiState("error");
      setErrorMessage(
        "Impossible de vérifier le stock. Vérifiez votre connexion et réessayez.",
      );
      return;
    }

    const stockIssues = stockResult.data?.issues ?? [];

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

    // Le numéro de commande vient désormais du serveur. Ce brouillon ne sert
    // qu'à construire une clé d'idempotence stable entre deux tentatives.
    const draftKey = crypto.randomUUID();
    if (!idempotencyRef.current) {
      idempotencyRef.current = `pay-${draftKey}`;
    }

    const zone = zoneId;
    const encodedMessage = encodeOrderFlags({
      note: client.message,
      packaging: showPackaging ? packaging : null,
    });

    const buildOrder = (
      slot: NonNullable<typeof scheduledSlot>,
    ): NewOrderRequest => ({
      // Ignorés par le serveur, qui génère les siens. Conservés uniquement
      // pour satisfaire le type avant persistance.
      id: "",
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
        // Affiché et conservé localement ; le serveur recalcule tout depuis le
        // catalogue et n'utilise jamais ce montant.
        unitPrice: getLineUnitPrice(item),
        /**
         * Champ historique, laissé vide : les anciens paniers envoyaient des
         * **noms** de suppléments, ce qui perdait le prix. Tout passe désormais
         * par `options`, par identifiant. Le serveur accepte encore l'ancien
         * champ pour les paniers qui dorment dans un navigateur.
         */
        supplements: [],
        /**
         * Les compléments partent par **identifiant**, avec la quantité, le
         * message et l'occasion. Aucun prix : le serveur relit le tarif en base
         * et c'est lui qui facture.
         */
        options: item.supplements.map((s) => ({
          optionId: s.id,
          ...(s.quantity !== undefined ? { quantity: s.quantity } : {}),
          ...(s.message ? { message: s.message } : {}),
          ...(s.occasionCategorySlug
            ? { occasionCategorySlug: s.occasionCategorySlug }
            : {}),
          ...(s.customOccasion ? { customOccasion: s.customOccasion } : {}),
        })),
        slug: item.slug,
        // Le serveur résout le prix de la variante dans sa propre table : sans
        // ce code, un nounours 150 cm serait facturé au prix d'entrée. C'est un
        // identifiant de choix, jamais un montant.
        ...(item.variantCode !== undefined ? { variantCode: item.variantCode } : {}),
        // Repli transitoire pour les paniers ouverts avant les variantes.
        ...(item.sizeCm !== undefined ? { sizeCm: item.sizeCm } : {}),
      })),
      subtotal: totals.subtotal,
      total: totals.total,
    });

    let activeSlot = scheduledSlot;
    let order = buildOrder(activeSlot);
    let persisted = false;
    let orderId = "";

    for (let attempt = 0; attempt < 2 && !persisted; attempt++) {
      try {
        const key: string =
          attempt === 0
            ? (idempotencyRef.current ?? `pay-${draftKey}`)
            : `pay-${draftKey}-slot-${crypto.randomUUID()}`;
        idempotencyRef.current = key;
        const saved = await persistOrderOnServer(order, key);
        orderId = saved.orderId;
        saveOrder({
          ...order,
          id: saved.orderId,
          trackingToken: saved.trackingToken ?? null,
          subtotal: saved.subtotal,
          deliveryFee: saved.deliveryFee,
          total: saved.total,
          /**
           * Copie locale, pour l'affichage immédiat. On reprend les libellés et
           * les prix que la cliente vient de voir ; le serveur, lui, a facturé
           * les siens et reste la référence.
           */
          items: order.items.map((item, index) => {
            const { options, ...rest } = item;
            const cartItem = cartItems[index];
            if (!options?.length || !cartItem) return rest;

            return {
              ...rest,
              options: cartItem.supplements.map((supplement) => ({
                optionId: supplement.id,
                groupName: supplement.groupName ?? "",
                optionName: supplement.name,
                pricingType: supplement.pricingType ?? "fixed",
                unitPrice: supplement.price,
                quantity: supplement.quantity ?? 1,
                totalPrice: supplement.price * (supplement.quantity ?? 1),
                customMessage: supplement.message ?? null,
                customOccasion: supplement.customOccasion ?? null,
              })),
            };
          }),
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

    if (!persisted || !orderId) {
      setUiState("idle");
      payingRef.current = false;
      setStep("commande");
      return;
    }

    const deviceKey = getOrCreateDeviceKey();
    const paymentResult = await safeFetch<{
      status?: string;
      error?: string;
      message?: string;
      reference?: string;
      paymentUrl?: string;
      orderId?: string;
    }>("/api/payments/initiate", {
      method: "POST",
      headers: {
        ...(deviceKey ? { "x-amg-device-key": deviceKey } : {}),
      },
      json: {
        orderId,
        method: paymentMethod,
      },
      // Une réponse vide ne peut pas être lue comme un paiement lancé.
      requireJson: true,
    });

    if (!paymentResult.ok) {
      setUiState("error");
      setErrorMessage(paymentResult.error.message);
      payingRef.current = false;
      return;
    }

    const paymentPayload = paymentResult.data ?? null;
    if (!paymentPayload) {
      setUiState("error");
      setErrorMessage("Le paiement n'a pas pu être lancé.");
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
        className="h-11 w-full cursor-pointer bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto sm:min-w-64"
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
