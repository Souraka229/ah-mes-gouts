"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, ShoppingBag } from "lucide-react";

import { EmptyState } from "@/components/shop/empty-state";
import { CheckoutStepIndicator } from "@/components/shop/checkout/checkout-step-indicator";
import { CheckoutSummary } from "@/components/shop/checkout/checkout-summary";
import { CheckoutMobileTotalBar } from "@/components/shop/checkout/checkout-mobile-total-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCheckoutStore } from "@/lib/checkout-store";
import { useCartStore } from "@/lib/cart-store";
import { useServerCheckoutQuote } from "@/lib/hooks/use-server-checkout-quote";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

const StepCommande = dynamic(
  () =>
    import("@/components/shop/checkout/step-commande").then(
      (m) => m.StepCommande,
    ),
);
const StepPayment = dynamic(
  () =>
    import("@/components/shop/checkout/step-payment").then(
      (m) => m.StepPayment,
    ),
);

type CheckoutWizardProps = {
  upsellCandidates?: Product[];
};

export function CheckoutWizard({ upsellCandidates }: CheckoutWizardProps = {}) {
  useServerCheckoutQuote();

  const step = useCheckoutStore((state) => state.step);
  const goBack = useCheckoutStore((state) => state.goBack);
  const cartItems = useCartStore((state) => state.items);

  const canGoBack = step === "payment";

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
    <div className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:py-12 lg:pb-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CheckoutStepIndicator currentStep={step} />
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
        <div key={step} className="checkout-step-enter">
          {step === "payment" ? (
            <StepPayment />
          ) : (
            <StepCommande upsellCandidates={upsellCandidates} />
          )}
        </div>

        <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <CheckoutSummary />
        </div>
      </div>

      <CheckoutMobileTotalBar />
    </div>
  );
}
