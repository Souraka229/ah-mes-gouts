import { describe, expect, it } from "vitest";

import { normalizeBeninPhone as toPaymentFormat } from "@/lib/payments/normalize-phone";
import {
  formatPhoneDisplay,
  normalizeBeninPhone as toCanonical,
  phoneSearchVariants,
  phonesMatch,
} from "@/lib/crm/phone";

/**
 * Ces deux modules délèguent maintenant à `lib/phone.ts`, mais ils n'ont PAS
 * le même contrat de sortie — c'est justement ce qui doit rester verrouillé.
 */

const SAME_NUMBER = [
  "+22955530826",
  "+229 55 53 08 26",
  "+2290155530826",
  "0022955530826",
  "002290155530826",
  "0155530826",
  "01 55 53 08 26",
  "55530826",
  "55 53 08 26",
];

describe("CRM — forme stockée", () => {
  it.each(SAME_NUMBER)("« %s » devient la forme canonique +229…", (input) => {
    expect(toCanonical(input)).toBe("+2290155530826");
  });

  it("retourne null sur une saisie invalide", () => {
    expect(toCanonical("abc")).toBeNull();
    expect(toCanonical("")).toBeNull();
  });

  it("affiche la forme lisible", () => {
    expect(formatPhoneDisplay("+2290155530826")).toBe("+229 01 55 53 08 26");
  });

  it("reconnaît le même abonné sous toutes ses écritures", () => {
    for (const input of SAME_NUMBER) {
      expect(phonesMatch(input, "+2290155530826")).toBe(true);
    }
  });
});

describe("Paiement — forme attendue par FeexPay", () => {
  it.each(SAME_NUMBER)("« %s » devient 229… SANS « + »", (input) => {
    const result = toPaymentFormat(input);

    expect(result).toBe("2290155530826");
    // FeexPay reçoit `phoneNumber: Number(phoneNumber)` : un « + » donnerait NaN.
    expect(result).not.toContain("+");
    expect(Number(result)).not.toBeNaN();
  });

  it("n'émet jamais la forme 00229…", () => {
    expect(toPaymentFormat("0022955530826")).not.toContain("00");
  });

  it("retourne null plutôt qu'un numéro tronqué", () => {
    expect(toPaymentFormat("5553")).toBeNull();
    expect(toPaymentFormat("+33 6 12 34 56 78")).toBeNull();
  });
});

describe("Recherche — les deux formes historiques sont couvertes", () => {
  it("accepte la forme canonique et la forme sans « + »", () => {
    expect(phoneSearchVariants("55530826").sort()).toEqual(
      ["+2290155530826", "2290155530826"].sort(),
    );
  });

  it("retourne une liste vide sur une saisie invalide", () => {
    // Surtout pas `[""]` : un `contains: ""` matcherait TOUTES les fiches.
    expect(phoneSearchVariants("abc")).toEqual([]);
    expect(phoneSearchVariants("")).toEqual([]);
  });

  it("ne contient jamais de chaîne vide", () => {
    for (const input of [...SAME_NUMBER, "abc", "", "12"]) {
      for (const variant of phoneSearchVariants(input)) {
        expect(variant.length).toBeGreaterThan(0);
      }
    }
  });
});
