"use client";

import { useEffect, useMemo } from "react";

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
  const deliveryLocality = useCheckoutStore((state) => state.deliveryLocality);
  const setLoading = useCheckoutQuoteStore((state) => state.setLoading);
  const setQuote = useCheckoutQuoteStore((state) => state.setQuote);
  const setError = useCheckoutQuoteStore((state) => state.setError);
  const reset = useCheckoutQuoteStore((state) => state.reset);

  const itemsKey = useMemo(
    () =>
      items
        .map(
          (item) =>
            `${item.slug}:${item.quantity}:${item.supplements
              .map((supplement) => supplement.name)
              .join(",")}`,
        )
        .join("|"),
    [items],
  );

  useEffect(() => {
    if (!itemsKey) {
      reset();
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const currentItems = useCartStore.getState().items;
      if (currentItems.length === 0) {
        reset();
        return;
      }
      setLoading();
      try {
        const response = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            mode,
            zoneId: mode === "delivery" ? zoneId : null,
            locality:
              mode === "delivery" && deliveryLocality
                ? deliveryLocality
                : null,
            items: currentItems.map((item) => ({
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
  }, [
    itemsKey,
    mode,
    zoneId,
    deliveryLocality,
    reset,
    setError,
    setLoading,
    setQuote,
  ]);
}
