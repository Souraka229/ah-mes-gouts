import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getCartTotals, mergeCartLine } from "@/lib/cart-utils";
import type { AddToCartPayload, CartLineItem } from "@/types/cart";

const CART_STORAGE_KEY = "ah-mes-gouts-cart";

type CartState = {
  items: CartLineItem[];
  isOpen: boolean;
  cartPulse: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (payload: AddToCartPayload) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  acknowledgeCartPulse: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      cartPulse: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      addItem: (payload) =>
        set((state) => ({
          items: mergeCartLine(state.items, payload),
          cartPulse: true,
        })),

      updateQuantity: (lineId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.lineId !== lineId)
              : state.items.map((item) =>
                  item.lineId === lineId ? { ...item, quantity } : item,
                ),
        })),

      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((item) => item.lineId !== lineId),
        })),

      clearCart: () => set({ items: [], isOpen: false }),

      acknowledgeCartPulse: () => set({ cartPulse: false }),
    }),
    {
      name: CART_STORAGE_KEY,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export function useCartTotals() {
  const items = useCartStore((state) => state.items);
  return useMemo(() => getCartTotals(items), [items]);
}

export function useCartItemCount() {
  return useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );
}
