import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ces tests verrouillent les garanties de sécurité du règlement de paiement.
 * Chacun correspond à une faille réellement présente en production avant
 * refonte — s'ils cassent, la faille est rouverte.
 */

const findUnique = vi.fn();
const update = vi.fn();

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    paymentAttempt: { findUnique, update },
  }),
}));

const getFeexPayTransactionStatus = vi.fn();
vi.mock("@/lib/payments/feexpay", () => ({
  getFeexPayConfig: () => ({
    shopId: "shop",
    apiKey: "key",
    mode: "live" as const,
  }),
  getFeexPayTransactionStatus: (...args: unknown[]) =>
    getFeexPayTransactionStatus(...args),
}));

const confirmOrderPayment = vi.fn();
vi.mock("@/lib/payments/confirm-order-payment", () => ({
  confirmOrderPayment: (...args: unknown[]) => confirmOrderPayment(...args),
}));

const notifyOps = vi.fn();
vi.mock("@/lib/notifications/ops-alerts", () => ({
  notifyOps: (...args: unknown[]) => notifyOps(...args),
  alertSecurity: (detail: string) => ({ kind: "security", title: detail }),
}));

const { settlePaymentByReference } = await import(
  "@/lib/payments/settle-payment"
);

const PENDING_ATTEMPT = {
  id: "att_1",
  orderId: "GE-ABCDEFGHJK",
  reference: "FP-REF-1",
  amount: 15_000,
  status: "PENDING" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({});
  confirmOrderPayment.mockResolvedValue({ ok: true, orderId: "GE-ABCDEFGHJK" });
});

describe("anti-rejeu", () => {
  it("refuse une référence inconnue sans jamais appeler FeexPay", async () => {
    // Le contournement d'origine : une référence quelconque au statut SUCCESS
    // confirmait n'importe quelle commande. Elle doit désormais correspondre
    // à une tentative enregistrée.
    findUnique.mockResolvedValue(null);

    const result = await settlePaymentByReference("REF-EMPRUNTEE");

    expect(result).toEqual({
      ok: false,
      error: "Référence de paiement inconnue.",
      status: 404,
    });
    expect(getFeexPayTransactionStatus).not.toHaveBeenCalled();
    expect(confirmOrderPayment).not.toHaveBeenCalled();
  });

  it("ne rejoue pas une tentative déjà réglée", async () => {
    findUnique.mockResolvedValue({ ...PENDING_ATTEMPT, status: "SUCCESS" });

    const result = await settlePaymentByReference("FP-REF-1");

    expect(result).toEqual({
      ok: true,
      orderId: "GE-ABCDEFGHJK",
      alreadySettled: true,
    });
    expect(confirmOrderPayment).not.toHaveBeenCalled();
  });

  it("refuse une tentative close (FAILED ou EXPIRED)", async () => {
    for (const status of ["FAILED", "EXPIRED"] as const) {
      vi.clearAllMocks();
      findUnique.mockResolvedValue({ ...PENDING_ATTEMPT, status });

      const result = await settlePaymentByReference("FP-REF-1");

      expect(result).toMatchObject({ ok: false, status: 409 });
      expect(confirmOrderPayment).not.toHaveBeenCalled();
    }
  });

  it("déduit la commande de la tentative, jamais d'un paramètre appelant", async () => {
    findUnique.mockResolvedValue(PENDING_ATTEMPT);
    getFeexPayTransactionStatus.mockResolvedValue({
      status: "SUCCESS",
      reference: "FP-REF-1",
      rawResponse: { amount: 15_000 },
    });

    const result = await settlePaymentByReference("FP-REF-1");

    expect(result).toEqual({ ok: true, orderId: "GE-ABCDEFGHJK" });
    expect(confirmOrderPayment).toHaveBeenCalledWith(
      "GE-ABCDEFGHJK",
      "FP-REF-1",
    );
  });
});

describe("contrôle de montant", () => {
  it("refuse et alerte quand le montant encaissé diffère", async () => {
    findUnique.mockResolvedValue(PENDING_ATTEMPT);
    getFeexPayTransactionStatus.mockResolvedValue({
      status: "SUCCESS",
      reference: "FP-REF-1",
      rawResponse: { amount: 100 },
    });

    const result = await settlePaymentByReference("FP-REF-1");

    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(confirmOrderPayment).not.toHaveBeenCalled();
    expect(notifyOps).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("accepte un montant fourni sous forme de chaîne", async () => {
    findUnique.mockResolvedValue(PENDING_ATTEMPT);
    getFeexPayTransactionStatus.mockResolvedValue({
      status: "SUCCESS",
      reference: "FP-REF-1",
      rawResponse: { montant: "15000" },
    });

    const result = await settlePaymentByReference("FP-REF-1");

    expect(result).toEqual({ ok: true, orderId: "GE-ABCDEFGHJK" });
  });

  it("confirme mais alerte quand le montant est absent de la réponse", async () => {
    // Compromis assumé : le format FeexPay n'est pas garanti et bloquer ici
    // refuserait des paiements légitimes. Le rejeu est déjà fermé en amont.
    findUnique.mockResolvedValue(PENDING_ATTEMPT);
    getFeexPayTransactionStatus.mockResolvedValue({
      status: "SUCCESS",
      reference: "FP-REF-1",
      rawResponse: { statut: "ok" },
    });

    const result = await settlePaymentByReference("FP-REF-1");

    expect(result).toEqual({ ok: true, orderId: "GE-ABCDEFGHJK" });
    expect(notifyOps).toHaveBeenCalledOnce();
  });
});

describe("statuts FeexPay", () => {
  it("renvoie 202 tant que le paiement est en attente", async () => {
    findUnique.mockResolvedValue(PENDING_ATTEMPT);
    getFeexPayTransactionStatus.mockResolvedValue({
      status: "PENDING",
      reference: "FP-REF-1",
    });

    const result = await settlePaymentByReference("FP-REF-1");

    expect(result).toMatchObject({ ok: false, status: 202 });
    // Surtout : la tentative reste PENDING pour que le cron la reprenne.
    expect(update).not.toHaveBeenCalled();
  });

  it("clôt la tentative sur un échec opérateur", async () => {
    findUnique.mockResolvedValue(PENDING_ATTEMPT);
    getFeexPayTransactionStatus.mockResolvedValue({
      status: "FAILED",
      reference: "FP-REF-1",
      error: "Solde insuffisant sur le compte Mobile Money.",
    });

    const result = await settlePaymentByReference("FP-REF-1");

    expect(result).toMatchObject({ ok: false, status: 402 });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });
});

describe("échec de confirmation", () => {
  it("laisse la tentative en PENDING et alerte si la commande ne peut être confirmée", async () => {
    // L'argent est encaissé : marquer FAILED ferait perdre la trace.
    // Le cron doit pouvoir reprendre.
    findUnique.mockResolvedValue(PENDING_ATTEMPT);
    getFeexPayTransactionStatus.mockResolvedValue({
      status: "SUCCESS",
      reference: "FP-REF-1",
      rawResponse: { amount: 15_000 },
    });
    confirmOrderPayment.mockResolvedValue({
      ok: false,
      error: "Stock épuisé.",
      status: 409,
    });

    const result = await settlePaymentByReference("FP-REF-1");

    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(notifyOps).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
  });
});

describe("garde-fous d'entrée", () => {
  it("refuse une référence vide", async () => {
    const result = await settlePaymentByReference("   ");
    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
