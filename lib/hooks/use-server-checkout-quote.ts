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

  /**
   * Empreinte des lignes, pour ne redemander un devis que quand quelque chose
   * de facturable a bougé.
   *
   * La variante et le **message** en font partie : changer de taille ou
   * corriger le texte d'une carte change le prix, et un devis périmé afficherait
   * un montant faux. C'était l'angle mort de la version précédente, qui
   * n'incluait pas `variantCode`.
   */
  const itemsKey = useMemo(
    () =>
      items
        .map(
          (item) =>
            `${item.slug}:${item.quantity}:${item.variantCode ?? item.sizeCm ?? ""}:` +
            item.supplements
              .map(
                (supplement) =>
                  `${supplement.id}×${supplement.quantity ?? 1}` +
                  `:${supplement.message ?? ""}` +
                  `:${supplement.occasionCategorySlug ?? ""}` +
                  `:${supplement.customOccasion ?? ""}`,
              )
              .join(","),
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
              /**
               * Les options partent par **identifiant**, jamais par nom ni par
               * prix : le serveur relit le tarif dans sa propre table. L'ancien
               * champ `supplements` par nom n'est plus envoyé — le serveur
               * résout les identifiants historiques (« chantilly ») par slug,
               * donc les paniers déjà ouverts continuent de fonctionner.
               */
              options: item.supplements.map((supplement) => ({
                optionId: supplement.id,
                ...(supplement.quantity !== undefined
                  ? { quantity: supplement.quantity }
                  : {}),
                ...(supplement.message ? { message: supplement.message } : {}),
                ...(supplement.occasionCategorySlug
                  ? { occasionCategorySlug: supplement.occasionCategorySlug }
                  : {}),
                ...(supplement.customOccasion
                  ? { customOccasion: supplement.customOccasion }
                  : {}),
              })),
              // Le serveur résout le prix de la variante dans sa propre table :
              // sans ce code, une fiche à tailles est refusée (« Choisissez une
              // option ») et le devis échoue.
              ...(item.variantCode !== undefined
                ? { variantCode: item.variantCode }
                : {}),
              // Repli transitoire pour les paniers ouverts avant les variantes.
              ...(item.sizeCm !== undefined ? { sizeCm: item.sizeCm } : {}),
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
