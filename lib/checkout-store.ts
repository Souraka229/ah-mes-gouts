import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getEmptyClient } from "@/lib/client-storage";
import type {
  CheckoutStep,
  ClientInfo,
  GiftDetails,
  PaymentMethod,
  ReceptionMode,
  ScheduledSlotSelection,
} from "@/types/order";

const CHECKOUT_STORAGE_KEY = "ah-mes-gouts-checkout";

export const emptyGiftDetails = (): GiftDetails => ({
  recipientName: "",
  recipientPhone: "",
  recipientAddress: "",
  recipientLandmark: "",
  giftMessage: "",
  senderVisible: true,
});

type CheckoutState = {
  step: CheckoutStep;
  mode: ReceptionMode | null;
  zoneId: string | null;
  /** Quartier choisi (Fidjrossè, Haie Vive…) — pas le code zone. */
  deliveryLocality: string | null;
  scheduledSlot: ScheduledSlotSelection | null;
  client: ClientInfo;
  isGift: boolean;
  gift: GiftDetails;
  paymentMethod: PaymentMethod | null;
  hasWelcomedBack: boolean;
  setStep: (step: CheckoutStep) => void;
  setMode: (mode: ReceptionMode) => void;
  setZoneId: (zoneId: string | null) => void;
  setDeliveryLocality: (locality: string | null) => void;
  setScheduledSlot: (slot: ScheduledSlotSelection | null) => void;
  setClient: (client: ClientInfo) => void;
  setIsGift: (isGift: boolean) => void;
  setGift: (gift: GiftDetails) => void;
  setGiftMessage: (message: string) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  setHasWelcomedBack: (value: boolean) => void;
  goBack: () => void;
  resetCheckout: () => void;
};

const initialState = {
  step: "commande" as CheckoutStep,
  mode: null as ReceptionMode | null,
  zoneId: null as string | null,
  deliveryLocality: null as string | null,
  scheduledSlot: null as ScheduledSlotSelection | null,
  client: getEmptyClient(),
  isGift: false,
  gift: emptyGiftDetails(),
  paymentMethod: null as PaymentMethod | null,
  hasWelcomedBack: false,
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ step }),
      setMode: (mode) =>
        set({
          mode,
          zoneId: mode === "delivery" ? get().zoneId : null,
          deliveryLocality:
            mode === "delivery" ? get().deliveryLocality : null,
          scheduledSlot: null,
        }),
      setZoneId: (zoneId) =>
        set({
          zoneId,
          deliveryLocality: zoneId ? get().deliveryLocality : null,
          scheduledSlot: null,
        }),
      setDeliveryLocality: (deliveryLocality) => set({ deliveryLocality }),
      setScheduledSlot: (scheduledSlot) => set({ scheduledSlot }),
      setClient: (client) => set({ client }),
      setIsGift: (isGift) =>
        set({
          isGift,
          gift: isGift ? get().gift : emptyGiftDetails(),
        }),
      setGift: (gift) => set({ gift }),
      setGiftMessage: (giftMessage) =>
        set({ gift: { ...get().gift, giftMessage } }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setHasWelcomedBack: (hasWelcomedBack) => set({ hasWelcomedBack }),

      goBack: () => {
        const { step } = get();
        if (step === "payment") set({ step: "commande" });
      },

      resetCheckout: () =>
        set({
          ...initialState,
          client: getEmptyClient(),
          gift: emptyGiftDetails(),
        }),
    }),
    {
      name: CHECKOUT_STORAGE_KEY,
      partialize: (state) => ({
        step: state.step,
        mode: state.mode,
        zoneId: state.zoneId,
        deliveryLocality: state.deliveryLocality,
        scheduledSlot: state.scheduledSlot,
        client: state.client,
        isGift: state.isGift,
        gift: state.gift,
        paymentMethod: state.paymentMethod,
        hasWelcomedBack: state.hasWelcomedBack,
      }),
      migrate: (persisted) => {
        const p = persisted as Record<string, unknown> & {
          step?: string;
          deliveryLocality?: string | null;
        };
        const next = {
          ...p,
          deliveryLocality: p.deliveryLocality ?? null,
        };
        if (
          next.step &&
          next.step !== "commande" &&
          next.step !== "payment"
        ) {
          return { ...next, step: "commande" as CheckoutStep };
        }
        return next as CheckoutState;
      },
      version: 3,
    },
  ),
);
