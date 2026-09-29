import { describe, expect, it } from "vitest";

import {
  canonicalPhone,
  formatPhoneDisplay,
  getWhatsAppNumber,
  getWhatsAppUrl,
  normalizePhone,
  phonesMatch,
} from "@/lib/phone";

/**
 * Les treize écritures du même numéro béninois doivent toutes converger vers
 * `+2290155530826`. C'est la garantie qui empêche un même client d'exister
 * plusieurs fois en base.
 */
const SAME_NUMBER = [
  "+22955530826",
  "+229 55530826",
  "+229 55 53 08 26",
  "+2290155530826",
  "+229 01 55 53 08 26",
  "0022955530826",
  "00229 55 53 08 26",
  "002290155530826",
  "00229 01 55 53 08 26",
  "0155530826",
  "01 55 53 08 26",
  "55530826",
  "55 53 08 26",
];

describe("normalizePhone — toutes les écritures d'un même numéro", () => {
  it.each(SAME_NUMBER)("« %s » donne +2290155530826", (input) => {
    const result = normalizePhone(input);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.e164).toBe("+2290155530826");
  });

  it.each(SAME_NUMBER)("« %s » donne le même numéro national", (input) => {
    const result = normalizePhone(input);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.nationalNumber).toBe("0155530826");
  });

  it.each(SAME_NUMBER)("« %s » s'affiche +229 01 55 53 08 26", (input) => {
    const result = normalizePhone(input);

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.display).toBe("+229 01 55 53 08 26");
  });
});

describe("normalizePhone — nettoyage de la saisie", () => {
  it("retire espaces, points, parenthèses et tirets", () => {
    const result = normalizePhone("+229 (55) 53-08-26");

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.e164).toBe("+2290155530826");
  });

  it("accepte les espaces insécables collés par un copier-coller", () => {
    const result = normalizePhone("+229 01 55 53 08 26");

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.e164).toBe("+2290155530826");
  });

  it("tolère les espaces autour de la saisie", () => {
    const result = normalizePhone("   55530826   ");

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.e164).toBe("+2290155530826");
  });
});

describe("normalizePhone — distinction ancien / moderne", () => {
  it("marque un numéro à 8 chiffres comme ancien format", () => {
    const result = normalizePhone("55530826");

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.legacyInput).toBe(true);
    expect(result.sourceFormat).toBe("legacy_local");
  });

  it("marque aussi un ancien numéro écrit avec l'indicatif", () => {
    const result = normalizePhone("+22955530826");

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.legacyInput).toBe(true);
    expect(result.sourceFormat).toBe("international");
  });

  it("ne marque pas un numéro moderne", () => {
    const result = normalizePhone("0155530826");

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.legacyInput).toBe(false);
    expect(result.sourceFormat).toBe("modern_local");
  });

  it("reconnaît la forme stockée historique du CRM (229… sans +)", () => {
    const result = normalizePhone("2290155530826");

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.e164).toBe("+2290155530826");
    expect(result.sourceFormat).toBe("national_with_cc");
  });
});

describe("normalizePhone — saisies invalides", () => {
  it.each([
    ["", "chaîne vide"],
    ["   ", "espaces seuls"],
    ["abc", "lettres"],
    ["+229abc", "lettres après l'indicatif"],
    ["5553", "trop court"],
    ["555308261", "trop long"],
    ["+229", "indicatif seul"],
    ["1234567890123456", "longueur impossible"],
    ["02 55 53 08 26", "préfixe national inconnu"],
    ["++2290155530826", "double +"],
    ["+229;DROP TABLE", "caractères dangereux"],
    ["<script>alert(1)</script>", "injection HTML"],
    ["55 53 08 26 ext 4", "poste téléphonique"],
  ])("refuse « %s » (%s)", (input) => {
    const result = normalizePhone(input);

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.code).toBe("INVALID_PHONE");
    expect(result.message).toBe("Le numéro de téléphone est invalide.");
  });

  it.each([null, undefined, 12345, {}, []])(
    "refuse une valeur non textuelle (%s)",
    (input) => {
      expect(normalizePhone(input).valid).toBe(false);
    },
  );
});

describe("normalizePhone — contexte pays", () => {
  it("refuse un numéro étranger plutôt que de le convertir de force", () => {
    for (const input of ["+33 6 12 34 56 78", "0033 6 12 34 56 78", "+1 555 0100"]) {
      const result = normalizePhone(input);
      expect(result.valid).toBe(false);
      if (result.valid) return;
      expect(result.code).toBe("UNSUPPORTED_COUNTRY");
    }
  });

  it("refuse de deviner quand le pays déclaré n'est pas le Bénin", () => {
    const result = normalizePhone("55530826", { country: "CI" });

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.code).toBe("UNSUPPORTED_COUNTRY");
  });

  it("accepte un numéro local quand le contexte béninois est déclaré", () => {
    expect(normalizePhone("55530826", { country: "BJ" }).valid).toBe(true);
  });
});

describe("formatPhoneDisplay", () => {
  it("regroupe le numéro par paires", () => {
    expect(formatPhoneDisplay("+2290155530826")).toBe("+229 01 55 53 08 26");
  });

  it("accepte aussi la forme sans +", () => {
    expect(formatPhoneDisplay("2290155530826")).toBe("+229 01 55 53 08 26");
  });
});

describe("WhatsApp", () => {
  it("produit un numéro sans + ni espaces", () => {
    expect(getWhatsAppNumber("+2290155530826")).toBe("2290155530826");
  });

  it.each(SAME_NUMBER)("« %s » produit 2290155530826", (input) => {
    expect(getWhatsAppNumber(input)).toBe("2290155530826");
  });

  it("ne génère jamais wa.me/+229… ni wa.me/00229…", () => {
    const url = getWhatsAppUrl("+2290155530826");

    expect(url).toBe("https://wa.me/2290155530826");
    expect(url).not.toContain("wa.me/+");
    expect(url).not.toContain("00229");
  });

  it("ajoute un message pré-rempli encodé", () => {
    const url = getWhatsAppUrl("0155530826", "Bonjour, ma commande");

    expect(url).toContain("https://wa.me/2290155530826?text=");
    expect(url).toContain(encodeURIComponent("Bonjour, ma commande"));
  });

  it("retourne null sur un numéro invalide au lieu d'un lien cassé", () => {
    expect(getWhatsAppNumber("abc")).toBeNull();
    expect(getWhatsAppUrl("abc")).toBeNull();
  });
});

describe("phonesMatch — recherche client", () => {
  it("reconnaît le même abonné sous toutes ses écritures", () => {
    for (const input of SAME_NUMBER) {
      expect(phonesMatch(input, "+2290155530826")).toBe(true);
    }
  });

  it("ne confond pas deux abonnés différents", () => {
    expect(phonesMatch("55530826", "0169949223")).toBe(false);
  });

  it("ne renvoie pas vrai sur une saisie invalide", () => {
    expect(phonesMatch("abc", "55530826")).toBe(false);
  });
});

describe("canonicalPhone", () => {
  it("retourne la forme stockable", () => {
    expect(canonicalPhone("69949223")).toBe("+2290169949223");
  });

  it("retourne null si invalide", () => {
    expect(canonicalPhone("n/a")).toBeNull();
  });
});
