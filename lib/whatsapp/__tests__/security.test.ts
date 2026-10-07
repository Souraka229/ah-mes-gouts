import { describe, expect, it } from "vitest";

import {
  extractPaymentReferenceStrict,
  inboundPhonesConsistent,
} from "../security";

describe("extractPaymentReferenceStrict", () => {
  it("accepte FP- et MOCK-", () => {
    expect(extractPaymentReferenceStrict("ref FP-abc-123")).toBe("FP-abc-123");
    expect(extractPaymentReferenceStrict("MOCK-ge-1-99")).toBe("MOCK-ge-1-99");
  });

  it("refuse motif hex générique", () => {
    expect(extractPaymentReferenceStrict("ABCDEF0123456789")).toBeNull();
  });
});

describe("inboundPhonesConsistent", () => {
  it("accepte si un seul champ", () => {
    expect(inboundPhonesConsistent("+2290197310742", undefined)).toBe(true);
  });

  it("refuse mismatch", () => {
    expect(
      inboundPhonesConsistent("22997123456", "2290197310742"),
    ).toBe(false);
  });
});
