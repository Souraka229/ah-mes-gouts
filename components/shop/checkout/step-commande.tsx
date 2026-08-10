"use client";

import { useEffect, useRef, useState } from "react";

import { StepClientForm } from "@/components/shop/checkout/step-client-form";
import { StepDeliveryZone } from "@/components/shop/checkout/step-delivery-zone";
import { StepMode } from "@/components/shop/checkout/step-mode";
import { StepSchedule } from "@/components/shop/checkout/step-schedule";
import { StepUpsell } from "@/components/shop/checkout/step-upsell";
import { Button } from "@/components/ui/button";
import {
  loadSavedClient,
  saveClient,
} from "@/lib/client-storage";
import { useCheckoutStore } from "@/lib/checkout-store";
import { linkDeviceToPhone, trackActivity } from "@/lib/crm/track";
import {
  clientInfoSchema,
  giftDetailsSchema,
  senderInfoSchema,
} from "@/lib/validation/checkout";
import type { ClientInfo, GiftDetails } from "@/types/order";
import type { Product } from "@/types/product";

type StepCommandeProps = {
  upsellCandidates?: Product[];
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold text-primary sm:text-xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

function validateClientBlock(
  mode: ReturnType<typeof useCheckoutStore.getState>["mode"],
  client: ClientInfo,
  isGift: boolean,
  gift: GiftDetails,
): Record<string, string> {
  if (!mode) return { mode: "Choisissez un mode de réception." };

  if (isGift) {
    const fieldErrors: Record<string, string> = {};
    const senderResult = senderInfoSchema.safeParse({
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
    });
    const giftPayload = {
      ...gift,
      recipientAddress:
        mode === "delivery"
          ? gift.recipientAddress
          : gift.recipientAddress || "En boutique",
      recipientLandmark:
        mode === "delivery" ? gift.recipientLandmark : gift.recipientLandmark || "—",
    };
    const giftSchema =
      mode === "delivery"
        ? giftDetailsSchema
        : giftDetailsSchema.omit({
            recipientAddress: true,
            recipientLandmark: true,
          });
    const giftResult = giftSchema.safeParse(giftPayload);

    if (!senderResult.success) {
      for (const issue of senderResult.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
    if (!giftResult.success) {
      for (const issue of giftResult.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
    return fieldErrors;
  }

  if (mode !== "delivery") {
    const result = clientInfoSchema
      .pick({ firstName: true, lastName: true, phone: true, message: true })
      .safeParse(client);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return fieldErrors;
    }
    return {};
  }

  const result = clientInfoSchema.safeParse(client);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fieldErrors;
  }
  return {};
}

export function StepCommande({ upsellCandidates }: StepCommandeProps) {
  const mode = useCheckoutStore((s) => s.mode);
  const zoneId = useCheckoutStore((s) => s.zoneId);
  const scheduledSlot = useCheckoutStore((s) => s.scheduledSlot);
  const client = useCheckoutStore((s) => s.client);
  const setClient = useCheckoutStore((s) => s.setClient);
  const isGift = useCheckoutStore((s) => s.isGift);
  const gift = useCheckoutStore((s) => s.gift);
  const setStep = useCheckoutStore((s) => s.setStep);
  const hasWelcomedBack = useCheckoutStore((s) => s.hasWelcomedBack);
  const setHasWelcomedBack = useCheckoutStore((s) => s.setHasWelcomedBack);

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (hasWelcomedBack) return;
    const saved = loadSavedClient();
    if (!saved?.firstName) return;
    setHasWelcomedBack(true);
    if (!client.phone && !client.firstName) {
      setClient(saved);
    }
  }, [
    client.firstName,
    client.phone,
    hasWelcomedBack,
    setClient,
    setHasWelcomedBack,
  ]);

  const prevModeRef = useRef(mode);
  const prevZoneRef = useRef(zoneId);

  // Quand le client choisit mode / zone, on amène le regard sur la suite — pas au mount.
  useEffect(() => {
    const modeJustSet = !prevModeRef.current && Boolean(mode);
    const zoneJustSet =
      mode === "delivery" && !prevZoneRef.current && Boolean(zoneId);
    prevModeRef.current = mode;
    prevZoneRef.current = zoneId;

    if (!modeJustSet && !zoneJustSet) return;

    const targetId = modeJustSet
      ? mode === "delivery"
        ? "checkout-section-zone"
        : "checkout-section-schedule"
      : "checkout-section-schedule";

    const el = document.getElementById(targetId);
    if (!el) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [mode, zoneId]);

  const handleContinue = () => {
    setFormError(null);

    if (!mode) {
      setFormError("Choisissez comment recevoir votre commande.");
      document.getElementById("checkout-section-mode")?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      return;
    }
    if (mode === "delivery" && !zoneId) {
      setFormError("Choisissez votre quartier de livraison.");
      document.getElementById("checkout-section-zone")?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      return;
    }
    if (!scheduledSlot) {
      setFormError("Choisissez un créneau horaire.");
      document.getElementById("checkout-section-schedule")?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      return;
    }

    const clientErrors = validateClientBlock(mode, client, isGift, gift);
    if (Object.keys(clientErrors).length > 0) {
      setFormError("Complétez vos informations de contact.");
      document.getElementById("checkout-section-client")?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      return;
    }

    const savedClient =
      mode === "delivery"
        ? client
        : { ...client, address: "", landmark: "" };

    saveClient(savedClient);
    setClient(savedClient);
    linkDeviceToPhone(savedClient.phone);
    trackActivity({ type: "checkout_start" });
    // Remonte avant le rendu paiement — le wizard renforce ensuite.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setStep("payment");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-primary sm:text-3xl lg:text-4xl">
          Votre commande
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground sm:text-base">
          Mode, créneau, coordonnées et suggestions — tout en une page.
        </p>
      </div>

      <div id="checkout-section-mode" className="scroll-mt-24">
        <Section title="1. Comment recevoir ?">
          <StepMode embedded />
        </Section>
      </div>

      {mode === "delivery" && (
        <div id="checkout-section-zone" className="scroll-mt-24">
          <Section title="2. Où livrer ?">
            <StepDeliveryZone embedded />
          </Section>
        </div>
      )}

      {mode && (
        <div id="checkout-section-schedule" className="scroll-mt-24">
          <Section title={mode === "delivery" ? "3. Quand ?" : "2. Quand ?"}>
            <StepSchedule embedded />
          </Section>
        </div>
      )}

      {mode && (
        <div id="checkout-section-client" className="scroll-mt-24">
          <Section
            title={
              mode === "delivery"
                ? "4. Vos informations"
                : "3. Vos informations"
            }
          >
            <StepClientForm embedded />
          </Section>
        </div>
      )}

      <div id="checkout-section-upsell" className="scroll-mt-24">
        <Section title="Suggestions Nounours & Carte">
          <StepUpsell embedded candidates={upsellCandidates} />
        </Section>
      </div>

      {formError && (
        <p role="alert" className="font-body text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button
        className="h-12 min-h-12 w-full cursor-pointer bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90 sm:w-auto sm:px-10"
        disabled={!mode}
        onClick={handleContinue}
      >
        Continuer vers le paiement
      </Button>
    </div>
  );
}
