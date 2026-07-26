"use client";

import { useEffect } from "react";

import { useCartStore } from "@/lib/cart-store";
import { useCheckoutStore } from "@/lib/checkout-store";
import {
  type ServerCheckoutQuote,
  useCheckoutQuoteStore,
} from "@/lib/checkout-quote-store";

/** Synchronise le récapitulatif avec les prix et frais calculés côté serveur. */
export function useServerCheckoutQuote(): void {
  const items = useCartStore((state) => state.items);
  const mode = useCheckoutStore((state) => state.mode);
  const zoneId = useCheckoutStore((state) => state.zoneId);
  const setLoading = useCheckoutQuoteStore((state) => state.setLoading);
  const setQuote = useCheckoutQuoteStore((state) => state.setQuote);
  const setError = useCheckoutQuoteStore((state) => state.setError);
  const reset = useCheckoutQuoteStore((state) => state.reset);

  useEffect(() => {
    if (items.length === 0) {
      reset();
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading();
      try {
        const response = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            mode,
            zoneId: mode === "delivery" ? zoneId : null,
            items: items.map((item) => ({
              slug: item.slug,
              name: item.name,
              quantity: item.quantity,
              supplements: item.supplements.map((supplement) => supplement.name),
            })),
          }),
        });
        const payload = (await response.json()) as
          | ServerCheckoutQuote
          | { error?: string };
        if (!response.ok || !("total" in payload)) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Calcul serveur indisponible.",
          );
        }
        setQuote(payload);
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(
          error instanceof Error
            ? error.message
            : "Calcul serveur indisponible.",
        );
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [items, mode, zoneId, reset, setError, setLoading, setQuote]);
}
