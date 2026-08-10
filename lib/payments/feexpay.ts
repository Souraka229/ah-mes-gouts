import type { PaymentMethod } from "@/types/order";

import { normalizeBeninPhone } from "@/lib/payments/normalize-phone";

export type FeexPayConfig = {
  shopId: string;
  apiKey: string;
  mode: "sandbox" | "live";
  callbackUrl?: string;
  siteUrl?: string;
};

export type FeexPayRequestInput = {
  orderId: string;
  amount: number;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  paymentMethod: PaymentMethod;
};

export type FeexPayInitResult =
  | {
      status: "SUCCESS";
      reference: string;
      rawResponse?: unknown;
    }
  | {
      status: "PENDING";
      reference: string;
      paymentUrl?: string;
      message: string;
      rawResponse?: unknown;
    }
  | {
      status: "FAILED";
      error: string;
    };

export type FeexPayStatusResult =
  | { status: "SUCCESS"; reference: string; rawResponse?: unknown }
  | { status: "PENDING"; reference: string; rawResponse?: unknown }
  | { status: "FAILED"; reference: string; error?: string; rawResponse?: unknown };

/**
 * Confirmé le 10/08/2026 via docs.feexpay.me/api/payin (doc officielle, page
 * "MTN Mobile Money Bénin" lue directement) : le host est api-v2.feexpay.me,
 * PAS api.feexpay.me — c'était la vraie cause des 502 depuis le début, avant
 * même mes changements précédents (qui corrigeaient des détails secondaires
 * sur le mauvais host). Un endpoint par opérateur sous /public/, confirmé.
 */
const API_ROOT = "https://api-v2.feexpay.me/api/transactions";
const API_BASE = `${API_ROOT}/public`;

const MOBILE_ENDPOINTS: Record<Exclude<PaymentMethod, "card">, string> = {
  mtn_momo: `${API_BASE}/requesttopay/mtn`,
  moov_money: `${API_BASE}/requesttopay/moov`,
  celtiis_cash: `${API_BASE}/requesttopay/celtiis_bj`,
};

export function getFeexPayConfig(): FeexPayConfig | null {
  const shopId = process.env.FEEXPAY_SHOP_ID;
  const apiKey = process.env.FEEXPAY_API_KEY;
  const mode = (process.env.FEEXPAY_MODE || "sandbox") as "sandbox" | "live";
  const callbackUrl = process.env.FEEXPAY_CALLBACK_URL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!shopId || !apiKey) {
    return null;
  }

  return { shopId, apiKey, mode, callbackUrl, siteUrl };
}

export function isFeexPayEnabled(): boolean {
  return process.env.FEEXPAY_ENABLE === "true" && getFeexPayConfig() !== null;
}

/**
 * Paiement mock / démo.
 * - Dev : activé par défaut
 * - Prod : uniquement si DEMO_PAYMENTS=true (ou FEEXPAY_MOCK=true) ET FeexPay désactivé
 * À retirer définitivement quand les clés FeexPay sont branchées.
 */
export function isMockPaymentAllowed(): boolean {
  if (isFeexPayEnabled()) return false;

  const explicitDemo =
    process.env.DEMO_PAYMENTS === "true" ||
    process.env.FEEXPAY_MOCK === "true";

  if (process.env.NODE_ENV === "production") {
    return explicitDemo;
  }

  return process.env.FEEXPAY_MOCK !== "false";
}

function authHeaders(config: FeexPayConfig): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };
}

/**
 * Timeout FeexPay — la route /api/payments/initiate déclare maxDuration=30s,
 * ça laisse une bonne marge pour la requête FeexPay elle-même + la confirmation
 * de commande (DB + notifications) qui suit en cas de succès.
 */
const FEEXPAY_TIMEOUT_MS = 20_000;

/** fetch avec timeout — une réponse FeexPay qui traîne ne doit jamais faire planter la fonction. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEEXPAY_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function splitName(full?: string): { firstName: string; lastName: string } {
  const parts = (full ?? "Client Gift").trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Client" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function mapFeexPayStatus(
  status: string | undefined,
): "SUCCESS" | "PENDING" | "FAILED" {
  const normalized = (status ?? "").toUpperCase();
  if (
    normalized === "SUCCESS" ||
    normalized === "SUCCESSFUL" ||
    normalized === "APPROVED"
  ) {
    return "SUCCESS";
  }
  if (normalized === "PENDING" || normalized === "PROCESSING") {
    return "PENDING";
  }
  return "FAILED";
}

/**
 * Initie un paiement FeexPay (Mobile Money ou carte).
 */
export async function initiateFeexPayPayment(
  input: FeexPayRequestInput,
  config: FeexPayConfig,
): Promise<FeexPayInitResult> {
  const phoneNumber = normalizeBeninPhone(input.customerPhone);
  if (!phoneNumber) {
    return {
      status: "FAILED",
      error: "Numéro de téléphone invalide (format Bénin attendu).",
    };
  }

  const amount = Math.round(input.amount);
  if (amount < 100) {
    return { status: "FAILED", error: "Montant minimum 100 FCFA." };
  }

  const { firstName, lastName } = splitName(input.customerName);
  const description = `Commande ${input.orderId}`;

  try {
    if (input.paymentMethod === "card") {
      const email =
        input.customerEmail?.trim() || "client@gift-entremets.bj";
      const successUrl =
        config.siteUrl != null
          ? `${config.siteUrl}/commande/confirmation?orderId=${encodeURIComponent(input.orderId)}`
          : undefined;

      const response = await fetchWithTimeout(`${API_BASE}/initcard`, {
        method: "POST",
        headers: authHeaders(config),
        body: JSON.stringify({
          shop: config.shopId,
          amount,
          phone: phoneNumber,
          first_name: firstName,
          last_name: lastName,
          email,
          type_card: "VISA",
          currency: "XOF",
          description,
          success_redirect_url: successUrl,
          error_redirect_url: successUrl,
          callback_info: input.orderId,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        reference?: string;
        status?: string;
        url?: string;
        payment_url?: string;
        message?: string;
        responsemsg?: string;
      };

      if (!response.ok) {
        return {
          status: "FAILED",
          error:
            data.message ||
            data.responsemsg ||
            `Erreur carte FeexPay (${response.status})`,
        };
      }

      const reference = data.reference ?? `FP-${input.orderId}`;
      const paymentUrl = data.url ?? data.payment_url;
      const mapped = mapFeexPayStatus(data.status);

      if (mapped === "SUCCESS") {
        return { status: "SUCCESS", reference, rawResponse: data };
      }

      return {
        status: "PENDING",
        reference,
        paymentUrl,
        message:
          data.message ||
          data.responsemsg ||
          "Finalisez le paiement sur la page sécurisée.",
        rawResponse: data,
      };
    }

    const endpoint = MOBILE_ENDPOINTS[input.paymentMethod];

    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify({
        shop: config.shopId,
        amount,
        phoneNumber: Number(phoneNumber),
        first_name: firstName,
        last_name: lastName,
        description,
        // Doc officielle : callback_info est une chaîne (ex. "order_12345"),
        // pas un objet.
        callback_info: input.orderId,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      reference?: string;
      status?: string;
      responsemsg?: string;
      message?: string;
    };

    if (!response.ok) {
      console.error(
        `[FeexPay] Mobile Money rejeté — HTTP ${response.status}, endpoint ${endpoint}:`,
        JSON.stringify(data),
      );
      return {
        status: "FAILED",
        error:
          data.message ||
          data.responsemsg ||
          `Erreur Mobile Money FeexPay (${response.status})`,
      };
    }

    const reference = data.reference ?? `FP-${input.orderId}`;
    const mapped = mapFeexPayStatus(data.status);

    if (mapped === "SUCCESS") {
      return { status: "SUCCESS", reference, rawResponse: data };
    }

    if (mapped === "FAILED") {
      console.error(
        `[FeexPay] Mobile Money statut FAILED — réponse brute:`,
        JSON.stringify(data),
      );
      return {
        status: "FAILED",
        error:
          data.responsemsg ||
          data.message ||
          "Paiement refusé par l'opérateur.",
      };
    }

    return {
      status: "PENDING",
      reference,
      message:
        data.responsemsg ||
        data.message ||
        "Validez le paiement sur votre téléphone (invite USSD).",
      rawResponse: data,
    };
  } catch (error) {
    return {
      status: "FAILED",
      error:
        error instanceof Error && error.name === "AbortError"
          ? "FeexPay met trop de temps à répondre. Réessayez dans un instant."
          : error instanceof Error
            ? error.message
            : "Erreur FeexPay",
    };
  }
}

/** Vérifie le statut d'une transaction FeexPay par référence. */
export async function getFeexPayTransactionStatus(
  reference: string,
  config: FeexPayConfig,
): Promise<FeexPayStatusResult> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/single/status/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${config.apiKey}` },
      },
    );

    const data = (await response.json().catch(() => ({}))) as {
      reference?: string;
      status?: string;
      responsemsg?: string;
      message?: string;
    };

    // 404 = transaction pas (encore) connue de FeexPay. Pendant le polling,
    // la traiter comme FAILED déclarerait à tort un paiement réel comme échoué.
    // On reste en PENDING : le polling a de toute façon un nombre max d'essais.
    if (response.status === 404) {
      return { status: "PENDING", reference, rawResponse: data };
    }

    const ref = data.reference ?? reference;
    const mapped = mapFeexPayStatus(data.status);

    if (mapped === "SUCCESS") {
      return { status: "SUCCESS", reference: ref, rawResponse: data };
    }
    if (mapped === "PENDING") {
      return { status: "PENDING", reference: ref, rawResponse: data };
    }

    return {
      status: "FAILED",
      reference: ref,
      error: data.responsemsg || data.message,
      rawResponse: data,
    };
  } catch (error) {
    return {
      status: "FAILED",
      reference,
      error: error instanceof Error ? error.message : "Erreur statut FeexPay",
    };
  }
}
