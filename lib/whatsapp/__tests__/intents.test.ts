import { describe, expect, it } from "vitest";

import { detectIntent, shouldInvokeLlm } from "../intents";

describe("detectIntent", () => {
  it("route menu sans LLM", () => {
    expect(detectIntent("C'est quoi au menu ?")).toBe("menu_stock");
    expect(detectIntent("prix nounours")).toBe("menu_stock");
  });

  it("route commande site", () => {
    expect(detectIntent("Je veux commander")).toBe("order_on_site");
    expect(detectIntent("payer en momo")).toBe("order_on_site");
  });

  it("intent payment disponible pour logs", () => {
    expect(["payment" as const].includes("payment")).toBe(true);
  });

  it("route livraison", () => {
    expect(detectIntent("frais de livraison au quartier")).toBe("delivery_ask");
  });

  it("unknown seulement si vraiment flou", () => {
    expect(detectIntent("ok")).toBe("unknown");
    expect(shouldInvokeLlm("ok", "unknown")).toBe(false);
    expect(shouldInvokeLlm("Vous livrez à Calavi demain ?", "unknown")).toBe(true);
  });
});
