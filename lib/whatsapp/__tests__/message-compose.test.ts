import { describe, expect, it } from "vitest";

import {
  compressForWhatsApp,
  joinBlocks,
  normalizeWhatsAppText,
  WHATSAPP_SOFT_MAX_CHARS,
} from "../message-compose";

describe("message-compose", () => {
  it("normalise les sauts de ligne", () => {
    expect(normalizeWhatsAppText("a\n\n\nb")).toBe("a\n\nb");
  });

  it("assemble des blocs", () => {
    expect(joinBlocks(["Ligne 1", "", "Ligne 2"])).toBe("Ligne 1\n\nLigne 2");
  });

  it("compresse au-delà du soft max", () => {
    const long = "x".repeat(WHATSAPP_SOFT_MAX_CHARS + 100);
    const out = compressForWhatsApp(long);
    expect(out.length).toBeLessThanOrEqual(WHATSAPP_SOFT_MAX_CHARS + 10);
    expect(out).toContain("giftentremets.com");
  });
});
