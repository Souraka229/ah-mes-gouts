import type { PaymentMethod } from "@/types/order";

export type PaymentResult =
  | { status: "success"; transactionRef: string }
  | { status: "error"; message: string };

export type ProcessPaymentInput = {
  method: PaymentMethod;
  amount: number;
  orderId: string;
  customerPhone: string;
};

/**
 * Point d'entrée unique pour tous les paiements.
 * Remplacez l'implémentation mock par l'agrégateur réel (GeniusPay / FeexPay / etc.).
 */
export async function processPayment(
  input: ProcessPaymentInput,
): Promise<PaymentResult> {
  return mockProcessPayment(input);
}

// TODO: brancher l'agrégateur Mobile Money réel avant l'ouverture publique — voir GeniusPay/FeexPay
async function mockProcessPayment(
  input: ProcessPaymentInput,
): Promise<PaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, 1800));

  const { method, amount, orderId } = input;

  if (amount <= 0) {
    return { status: "error", message: "Montant invalide." };
  }

  if (method === "card" && amount > 50000) {
    return {
      status: "error",
      message:
        "Paiement refusé par la banque. Réessayez ou choisissez Mobile Money.",
    };
  }

  return {
    status: "success",
    transactionRef: `MOCK-${orderId}-${Date.now()}`,
  };
}
