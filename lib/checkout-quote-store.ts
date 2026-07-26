import { create } from "zustand";

export type ServerCheckoutQuote = {
  subtotal: number;
  deliveryFee: number;
  total: number;
  zoneName: string | null;
};

type CheckoutQuoteState = {
  quote: ServerCheckoutQuote | null;
  loading: boolean;
  error: string | null;
  setLoading: () => void;
  setQuote: (quote: ServerCheckoutQuote) => void;
  setError: (error: string) => void;
  reset: () => void;
};

export const useCheckoutQuoteStore = create<CheckoutQuoteState>((set) => ({
  quote: null,
  loading: false,
  error: null,
  setLoading: () => set({ quote: null, loading: true, error: null }),
  setQuote: (quote) => set({ quote, loading: false, error: null }),
  setError: (error) => set({ loading: false, error }),
  reset: () => set({ quote: null, loading: false, error: null }),
}));
