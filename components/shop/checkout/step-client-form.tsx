"use client";

import { useEffect, useState } from "react";

import { GiftModeSelector } from "@/components/shop/checkout/gift-mode-selector";
import { CheckoutBusinessNotices } from "@/components/shop/checkout/checkout-business-notices";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getClientFirstName,
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
import { cn } from "@/lib/utils";
import type { ClientInfo, GiftDetails } from "@/types/order";

const GIFT_MESSAGE_MAX = 280;

export function StepClientForm({ embedded = false }: { embedded?: boolean }) {
  const client = useCheckoutStore((state) => state.client);
  const setClient = useCheckoutStore((state) => state.setClient);
  const isGift = useCheckoutStore((state) => state.isGift);
  const setIsGift = useCheckoutStore((state) => state.setIsGift);
  const gift = useCheckoutStore((state) => state.gift);
  const setGift = useCheckoutStore((state) => state.setGift);
  const setStep = useCheckoutStore((state) => state.setStep);
  const mode = useCheckoutStore((state) => state.mode);
  const hasWelcomedBack = useCheckoutStore((state) => state.hasWelcomedBack);
  const setHasWelcomedBack = useCheckoutStore((state) => state.setHasWelcomedBack);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadSavedClient();
    if (!saved) return;

    const isEmpty = !client.phone && !client.firstName;
    if (isEmpty) {
      setClient(saved);
    }

    if (!hasWelcomedBack && saved.firstName) {
      setWelcomeName(getClientFirstName(saved));
      setHasWelcomedBack(true);
    }
  }, [client.firstName, client.phone, hasWelcomedBack, setClient, setHasWelcomedBack]);

  const updateClient = (field: keyof ClientInfo, value: string) => {
    setClient({ ...client, [field]: value });
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const updateGift = (field: keyof GiftDetails, value: string | boolean) => {
    setGift({ ...gift, [field]: value });
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const advanceAfterClient = (saved: ClientInfo) => {
    saveClient(saved);
    linkDeviceToPhone(saved.phone);
    trackActivity({ type: "checkout_start" });
    if (!embedded) setStep("payment");
  };

  const handleContinue = () => {
    if (isGift) {
      const senderResult = senderInfoSchema.safeParse({
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
      });

      const giftPayload = {
        ...gift,
        recipientAddress:
          mode === "delivery" ? gift.recipientAddress : gift.recipientAddress || "En boutique",
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

      const fieldErrors: Record<string, string> = {};

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

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }

      advanceAfterClient({
        ...client,
        address: "",
        landmark: "",
        message: "",
      });
      return;
    }

    if (mode !== "delivery") {
      const pickupSchema = clientInfoSchema.pick({
        firstName: true,
        lastName: true,
        phone: true,
        message: true,
      });
      const result = pickupSchema.safeParse(client);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0] as string;
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }
      advanceAfterClient({ ...client, address: "", landmark: "" });
      return;
    }

    const result = clientInfoSchema.safeParse(client);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    saveClient(result.data);
    linkDeviceToPhone(result.data.phone);
    trackActivity({ type: "checkout_start" });
    if (!embedded) setStep("payment");
  };

  const giftMessageLength = gift.giftMessage.length;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
            Vos informations
          </h1>
          <p className="mt-2 font-body text-muted-foreground">
            {isGift
              ? "Préparez votre surprise — le destinataire ne verra que ce que vous choisissez de partager."
              : mode === "delivery"
                ? "Où devons-nous livrer votre commande ?"
                : mode === "dinein"
                  ? "Comment pouvons-nous vous joindre pour votre venue en boutique ?"
                  : "Comment pouvons-nous vous joindre pour le retrait en boutique ?"}
          </p>
        </div>
      )}

      {!embedded && <CheckoutBusinessNotices variant="full" />}

      <GiftModeSelector isGift={isGift} onChange={setIsGift} />

      {welcomeName && !isGift && (
        <div className="rounded-2xl border border-secondary bg-secondary/30 px-4 py-3 font-body text-sm text-text">
          Bon retour {welcomeName}, on a gardé tes infos pour aller plus vite.
        </div>
      )}

      {isGift ? (
        <>
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold text-primary">
              Le destinataire
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="recipientName"
                label="Nom du destinataire"
                value={gift.recipientName}
                error={errors.recipientName}
                className="sm:col-span-2"
                onChange={(value) => updateGift("recipientName", value)}
              />
              <Field
                id="recipientPhone"
                label="Téléphone du destinataire"
                value={gift.recipientPhone}
                error={errors.recipientPhone}
                className="sm:col-span-2"
                inputMode="tel"
                onChange={(value) => updateGift("recipientPhone", value)}
              />
              {mode === "delivery" && (
                <>
                  <Field
                    id="recipientAddress"
                    label="Adresse de livraison"
                    value={gift.recipientAddress}
                    error={errors.recipientAddress}
                    className="sm:col-span-2"
                    onChange={(value) => updateGift("recipientAddress", value)}
                  />
                  <Field
                    id="recipientLandmark"
                    label="Repère"
                    value={gift.recipientLandmark}
                    error={errors.recipientLandmark}
                    className="sm:col-span-2"
                    onChange={(value) => updateGift("recipientLandmark", value)}
                  />
                </>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="giftMessage" className="font-body text-sm font-medium">
                  Ton message
                </Label>
                <span
                  className={cn(
                    "font-body text-xs",
                    giftMessageLength > GIFT_MESSAGE_MAX
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {giftMessageLength}/{GIFT_MESSAGE_MAX}
                </span>
              </div>
              <textarea
                id="giftMessage"
                value={gift.giftMessage}
                onChange={(event) =>
                  updateGift("giftMessage", event.target.value.slice(0, GIFT_MESSAGE_MAX))
                }
                rows={4}
                maxLength={GIFT_MESSAGE_MAX}
                className={cn(
                  "mt-2 w-full resize-none rounded-xl border border-border bg-bg px-3 py-2",
                  "font-body text-sm text-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
                placeholder="Un mot doux pour accompagner la surprise..."
              />
              {errors.giftMessage && (
                <p className="mt-1 font-body text-xs text-destructive">
                  {errors.giftMessage}
                </p>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
              <Checkbox
                id="senderVisible"
                checked={!gift.senderVisible}
                onCheckedChange={(checked) =>
                  updateGift("senderVisible", checked !== true)
                }
                className="mt-0.5 cursor-pointer"
              />
              <div>
                <Label
                  htmlFor="senderVisible"
                  className="cursor-pointer font-body text-sm font-medium text-text"
                >
                  Rester anonyme
                </Label>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  Le destinataire ne verra pas votre nom sur le message ni le
                  suivi de commande.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-display text-xl font-semibold text-primary">
              Vos coordonnées
            </h2>
            <p className="font-body text-sm text-muted-foreground">
              Pour la facturation et le paiement — distinct du destinataire.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="firstName"
                label="Votre prénom"
                value={client.firstName}
                error={errors.firstName}
                onChange={(value) => updateClient("firstName", value)}
              />
              <Field
                id="lastName"
                label="Votre nom"
                value={client.lastName}
                error={errors.lastName}
                onChange={(value) => updateClient("lastName", value)}
              />
              <Field
                id="phone"
                label="Votre téléphone"
                value={client.phone}
                error={errors.phone}
                className="sm:col-span-2"
                inputMode="tel"
                onChange={(value) => updateClient("phone", value)}
              />
            </div>
          </section>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="firstName"
            label="Prénom"
            value={client.firstName}
            error={errors.firstName}
            onChange={(value) => updateClient("firstName", value)}
          />
          <Field
            id="lastName"
            label="Nom"
            value={client.lastName}
            error={errors.lastName}
            onChange={(value) => updateClient("lastName", value)}
          />
          <Field
            id="phone"
            label="Téléphone"
            value={client.phone}
            error={errors.phone}
            className="sm:col-span-2"
            inputMode="tel"
            onChange={(value) => updateClient("phone", value)}
          />
          {mode === "delivery" && (
            <>
              <Field
                id="address"
                label="Adresse"
                value={client.address}
                error={errors.address}
                className="sm:col-span-2"
                onChange={(value) => updateClient("address", value)}
              />
              <Field
                id="landmark"
                label="Repère"
                value={client.landmark}
                error={errors.landmark}
                className="sm:col-span-2"
                onChange={(value) => updateClient("landmark", value)}
              />
            </>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor="message" className="font-body text-sm font-medium">
              Message (optionnel)
            </Label>
            <textarea
              id="message"
              value={client.message}
              onChange={(event) => updateClient("message", event.target.value)}
              rows={3}
              className={cn(
                "mt-2 w-full resize-none rounded-xl border border-border bg-card px-3 py-2",
                "font-body text-sm text-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
              placeholder="Instructions spéciales, code d'accès..."
            />
          </div>
        </div>
      )}

      {!embedded && (
        <Button
          className="h-11 cursor-pointer bg-accent text-text hover:bg-accent/90"
          onClick={handleContinue}
        >
          Continuer
        </Button>
      )}
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  onChange: (value: string) => void;
};

function Field({
  id,
  label,
  value,
  error,
  className,
  inputMode,
  onChange,
}: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="font-body text-sm font-medium">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 cursor-text font-body"
        aria-invalid={Boolean(error)}
      />
      {error && (
        <p className="mt-1 font-body text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
