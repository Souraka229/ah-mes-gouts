"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";

import { EmptyState } from "@/components/shop/empty-state";

import { CheckoutStepIndicator } from "@/components/shop/checkout/checkout-step-indicator";
import { CheckoutSummary } from "@/components/shop/checkout/checkout-summary";
import { StepClientForm } from "@/components/shop/checkout/step-client-form";
import { StepDeliveryZone } from "@/components/shop/checkout/step-delivery-zone";
import { StepMode } from "@/components/shop/checkout/step-mode";
import { StepPayment } from "@/components/shop/checkout/step-payment";
import { StepSchedule } from "@/components/shop/checkout/step-schedule";
import { StepUpsell } from "@/components/shop/checkout/step-upsell";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCheckoutStore } from "@/lib/checkout-store";
import { useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import type { CheckoutStep } from "@/types/order";

const stepComponents: Record<CheckoutStep, React.ComponentType> = {
  mode: StepMode,
  zone: StepDeliveryZone,
  schedule: StepSchedule,
  client: StepClientForm,
  upsell: StepUpsell,
  payment: StepPayment,
};

export function CheckoutWizard() {
  const step = useCheckoutStore((state) => state.step);
  const mode = useCheckoutStore((state) => state.mode);
  const goBack = useCheckoutStore((state) => state.goBack);
  const cartItems = useCartStore((state) => state.items);

  useEffect(() => {
    if (step === "zone" && mode === "pickup") {
      useCheckoutStore.getState().setStep("schedule");
    }
  }, [step, mode]);

  const StepComponent = stepComponents[step];
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
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <StepComponent />
          </motion.div>
        </AnimatePresence>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CheckoutSummary />
        </div>
      </div>
    </div>
  );
}
