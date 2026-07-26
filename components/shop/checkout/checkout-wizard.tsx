"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
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

/** Remonte immédiatement en haut — sinon le client reste sur le footer après une longue étape. */
function scrollCheckoutToTop() {
  if (typeof window === "undefined") return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? "auto" : "smooth" });
  // Filet mobile : certains WebViews ignorent scrollTo pendant le rendu.
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
}

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
  const topRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(step);

  const canGoBack = step === "payment";

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    scrollCheckoutToTop();
    topRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [step]);

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
    <div
      ref={topRef}
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:py-12 lg:pb-12"
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CheckoutStepIndicator currentStep={step} />
        {canGoBack && (
          <Button
            variant="ghost"
            className="w-fit cursor-pointer gap-2"
            onClick={() => {
              goBack();
              scrollCheckoutToTop();
            }}
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
