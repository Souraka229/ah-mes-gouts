"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";

import { EmptyState } from "@/components/shop/empty-state";
import { CheckoutStepIndicator } from "@/components/shop/checkout/checkout-step-indicator";
import { CheckoutSummary } from "@/components/shop/checkout/checkout-summary";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCheckoutStore } from "@/lib/checkout-store";
import { useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import type { CheckoutStep } from "@/types/order";
import type { Product } from "@/types/product";

const StepMode = dynamic(
  () =>
    import("@/components/shop/checkout/step-mode").then((m) => m.StepMode),
);
const StepDeliveryZone = dynamic(
  () =>
    import("@/components/shop/checkout/step-delivery-zone").then(
      (m) => m.StepDeliveryZone,
    ),
);
const StepSchedule = dynamic(
  () =>
    import("@/components/shop/checkout/step-schedule").then(
      (m) => m.StepSchedule,
    ),
);
const StepClientForm = dynamic(
  () =>
    import("@/components/shop/checkout/step-client-form").then(
      (m) => m.StepClientForm,
    ),
);
const StepUpsell = dynamic(
  () =>
    import("@/components/shop/checkout/step-upsell").then((m) => m.StepUpsell),
);
const StepPayment = dynamic(
  () =>
    import("@/components/shop/checkout/step-payment").then(
      (m) => m.StepPayment,
    ),
);

const stepComponents: Record<
  Exclude<CheckoutStep, "upsell">,
  React.ComponentType
> = {
  mode: StepMode,
  zone: StepDeliveryZone,
  schedule: StepSchedule,
  client: StepClientForm,
  payment: StepPayment,
};

type CheckoutWizardProps = {
  upsellCandidates?: Product[];
};

export function CheckoutWizard({ upsellCandidates }: CheckoutWizardProps = {}) {
  const step = useCheckoutStore((state) => state.step);
  const mode = useCheckoutStore((state) => state.mode);
  const goBack = useCheckoutStore((state) => state.goBack);
  const cartItems = useCartStore((state) => state.items);

  useEffect(() => {
    if (step === "zone" && mode && mode !== "delivery") {
      useCheckoutStore.getState().setStep("schedule");
    }
  }, [step, mode]);

  const canGoBack = step !== "mode";
  const showZone = mode === "delivery";

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState
          icon={ShoppingBag}
          title="Votre panier est vide"
          description="Ajoutez au moins une création avant de lancer votre commande."
        >
          <Link
            href="/catalogue"
            className={cn(buttonVariants(), "cursor-pointer")}
          >
            Explorer la carte
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CheckoutStepIndicator currentStep={step} showZone={showZone} />
        {canGoBack && (
          <Button
            variant="ghost"
            className="w-fit cursor-pointer gap-2"
            onClick={goBack}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Retour
          </Button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div
          key={step}
          className="checkout-step-enter"
        >
          {step === "upsell" ? (
            <StepUpsell candidates={upsellCandidates} />
          ) : (
            (() => {
              const StepComponent = stepComponents[step];
              return <StepComponent />;
            })()
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CheckoutSummary />
        </div>
      </div>
    </div>
  );
}
