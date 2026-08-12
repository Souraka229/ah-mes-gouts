import { describe, expect, it } from "vitest";

import { generateOrderId, generateTrackingToken } from "@/lib/server/order-id";

describe("generateOrderId", () => {
  it("respecte le format GE-XXXXXXXXXX", () => {
    expect(generateOrderId()).toMatch(/^GE-[0-9A-HJKMNP-TV-Z]{10}$/);
  });

  it("exclut les caractères ambigus à l'oral (I, L, O, U)", () => {
    const sample = Array.from({ length: 500 }, () => generateOrderId()).join("");
    expect(sample).not.toMatch(/[ILOU]/);
  });

  it("ne collisionne pas — l'ancien ID était un horodatage tronqué", () => {
    // Le bug d'origine : deux commandes dans la même milliseconde produisaient
    // le même identifiant, et le second create échouait en 500 pour la cliente.
    const ids = new Set(Array.from({ length: 20_000 }, generateOrderId));
    expect(ids.size).toBe(20_000);
  });

  it("n'est pas dérivé du temps — deux appels consécutifs diffèrent partout", () => {
    const a = generateOrderId().slice(3);
    const b = generateOrderId().slice(3);
    const sharedPrefix = [...a].findIndex((char, i) => char !== b[i]);
    // Un ID horodaté partagerait un long préfixe commun ; ici la divergence
    // doit survenir dès les premiers caractères.
    expect(sharedPrefix).toBeLessThan(4);
  });
});

describe("generateTrackingToken", () => {
  it("fait 26 caractères de l'alphabet Crockford", () => {
    expect(generateTrackingToken()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("est unique sur un large échantillon", () => {
    const tokens = new Set(
      Array.from({ length: 20_000 }, generateTrackingToken),
    );
    expect(tokens.size).toBe(20_000);
  });
});
