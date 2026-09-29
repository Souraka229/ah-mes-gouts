import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  PLATFORM_BODY_LIMIT_BYTES,
  formatBytes,
  validateUploadFile,
} from "@/lib/uploads";

/**
 * Le plafond d'envoi doit rester STRICTEMENT sous la limite de corps de
 * requête de la plateforme. C'est le dépassement qui produisait une page
 * d'erreur HTML, donc « Unexpected end of JSON input » dans le back-office.
 */
describe("plafond d'envoi", () => {
  it("reste sous la limite de la plateforme", () => {
    expect(MAX_UPLOAD_BYTES).toBeLessThan(PLATFORM_BODY_LIMIT_BYTES);
  });

  it("garde une marge pour l'encapsulation multipart", () => {
    const marge = PLATFORM_BODY_LIMIT_BYTES - MAX_UPLOAD_BYTES;
    expect(marge).toBeGreaterThanOrEqual(256 * 1024);
  });
});

describe("validateUploadFile", () => {
  it("accepte une image JPEG raisonnable", () => {
    expect(
      validateUploadFile({ type: "image/jpeg", size: 800 * 1024 }),
    ).toBeNull();
  });

  it("accepte PNG, WebP et GIF", () => {
    for (const type of ["image/png", "image/webp", "image/gif"]) {
      expect(validateUploadFile({ type, size: 1024 })).toBeNull();
    }
  });

  it("refuse un fichier juste au-dessus du plafond, avec un message humain", () => {
    const message = validateUploadFile({
      type: "image/jpeg",
      size: MAX_UPLOAD_BYTES + 1,
    });

    expect(message).not.toBeNull();
    expect(message).toContain("trop lourde");
    expect(message).toContain("Maximum 4 Mo");
    expect(message).not.toContain("JSON");
  });

  it("refuse un fichier entre notre ancien plafond et la limite plateforme", () => {
    // Le cas exact qui cassait : 4,6 Mo passait notre validation mais pas celle
    // de l'hébergeur.
    const message = validateUploadFile({
      type: "image/jpeg",
      size: 4.6 * 1024 * 1024,
    });

    expect(message).not.toBeNull();
  });

  it("refuse un format non pris en charge", () => {
    const message = validateUploadFile({
      type: "application/pdf",
      size: 1024,
    });

    expect(message).toContain("Format non pris en charge");
  });

  it("refuse un fichier vide", () => {
    expect(
      validateUploadFile({ type: "image/png", size: 0 }),
    ).toContain("vide");
  });

  it("refuse un type vide", () => {
    expect(validateUploadFile({ type: "", size: 1024 })).not.toBeNull();
  });
});

describe("formatBytes", () => {
  it("affiche les mégaoctets", () => {
    expect(formatBytes(4 * 1024 * 1024)).toBe("4 Mo");
  });

  it("affiche les kilooctets", () => {
    expect(formatBytes(2048)).toBe("2 Ko");
  });
});
