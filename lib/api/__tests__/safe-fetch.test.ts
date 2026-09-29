import { afterEach, describe, expect, it, vi } from "vitest";

import { safeFetch } from "@/lib/api/safe-fetch";

/**
 * Ces tests couvrent le scénario qui a produit en production
 * « Failed to execute 'json' on 'Response': Unexpected end of JSON input » :
 * un corps non-JSON (page HTML de Vercel, 413, 502, 504) ou vide.
 *
 * La garantie à tenir : `safeFetch` ne rejette jamais, et un échec n'est
 * jamais confondu avec un succès vide.
 */

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function htmlResponse(html: string, status: number) {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("safeFetch — succès", () => {
  it("lit un 200 JSON", async () => {
    mockFetch(async () => jsonResponse({ products: [{ id: "p1" }] }));

    const result = await safeFetch<{ products: { id: string }[] }>("/api/x");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(200);
    expect(result.data.products[0].id).toBe("p1");
    expect(result.empty).toBe(false);
  });

  it("lit un 201 JSON", async () => {
    mockFetch(async () => jsonResponse({ id: "new" }, 201));

    const result = await safeFetch<{ id: string }>("/api/x", {
      method: "POST",
      json: { name: "test" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(201);
    expect(result.data.id).toBe("new");
  });

  it("traite un 204 sans corps comme un succès vide explicite", async () => {
    mockFetch(async () => new Response(null, { status: 204 }));

    const result = await safeFetch("/api/x", { method: "DELETE" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.empty).toBe(true);
    expect(result.data).toBeNull();
  });

  it("traite un 200 à corps vide comme un succès vide, pas comme une erreur de parsing", async () => {
    mockFetch(async () => new Response("", { status: 200 }));

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.empty).toBe(true);
  });

  it("refuse un 200 à corps vide quand une charge utile est attendue", async () => {
    mockFetch(async () => new Response("", { status: 200 }));

    const result = await safeFetch("/api/x", { requireJson: true });

    // Sinon l'appelant lirait `data.orders ?? []` et afficherait « aucune commande ».
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_RESPONSE");
  });

  it("expose le requestId renvoyé par le serveur", async () => {
    mockFetch(async () =>
      jsonResponse({ ok: true }, 200, { "x-request-id": "req-123" }),
    );

    const result = await safeFetch("/api/x");

    expect(result.requestId).toBe("req-123");
  });

  it("sérialise `json` et pose le Content-Type automatiquement", async () => {
    const spy = mockFetch(async () => jsonResponse({ ok: true }));

    await safeFetch("/api/x", { method: "POST", json: { name: "abc" } });

    const init = spy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(init.body).toBe(JSON.stringify({ name: "abc" }));
  });
});

describe("safeFetch — erreurs HTTP en JSON", () => {
  it.each([
    [400, "VALIDATION_FAILED"],
    [401, "AUTHENTICATION_REQUIRED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [422, "VALIDATION_FAILED"],
    [429, "RATE_LIMITED"],
    [500, "SERVER_ERROR"],
    [502, "EXTERNAL_SERVICE_ERROR"],
    [503, "EXTERNAL_SERVICE_ERROR"],
  ])("mappe le statut %i vers %s", async (status, expectedCode) => {
    mockFetch(async () => jsonResponse({ error: "peu importe" }, status));

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(status);
    expect(result.error.code).toBe(expectedCode);
  });

  it("remonte le message serveur quand il est exploitable", async () => {
    mockFetch(async () => jsonResponse({ error: "Catégorie invalide" }, 400));

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe("Catégorie invalide");
  });

  it("remonte un message serveur au format contrat { error: { message } }", async () => {
    mockFetch(async () =>
      jsonResponse(
        { error: { code: "PRODUCT_CREATE_FAILED", message: "Création impossible" } },
        409,
      ),
    );

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe("Création impossible");
  });

  it("expose le corps analysé pour les routes qui joignent des détails à l'erreur", async () => {
    // `POST /api/orders` renvoie un 409 { error: "SLOT_FULL", nextSlot } : le
    // tunnel a besoin de `nextSlot` pour basculer sur le créneau suivant, et un
    // simple message ne peut pas le transporter.
    mockFetch(async () =>
      jsonResponse(
        { error: "SLOT_FULL", nextSlot: { start: "2026-09-29T17:00:00Z" } },
        409,
      ),
    );

    const result = await safeFetch("/api/orders", { method: "POST" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const body = result.body as { nextSlot?: { start: string } };
    expect(body.nextSlot?.start).toBe("2026-09-29T17:00:00Z");
  });

  it("met le corps à null quand la réponse n'est pas du JSON", async () => {
    mockFetch(async () => htmlResponse("<html>erreur</html>", 500));

    const result = await safeFetch("/api/orders");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.body).toBeNull();
  });

  it("remplace un message technique par un libellé humain", async () => {
    mockFetch(async () =>
      jsonResponse({ error: "Unexpected end of JSON input" }, 500),
    );

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).not.toContain("JSON");
    expect(result.error.message).toBe(
      "Erreur inattendue de notre côté. Réessayez.",
    );
  });
});

describe("safeFetch — corps non-JSON (le bug d'origine)", () => {
  it("ne plante pas sur un 500 HTML et n'expose pas le HTML", async () => {
    mockFetch(async () => htmlResponse("<html><body>Gateway</body></html>", 500));

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).not.toContain("<html>");
    expect(result.error.code).toBe("SERVER_ERROR");
  });

  it("ne plante pas sur un 502 HTML", async () => {
    mockFetch(async () => htmlResponse("<html>Bad gateway</html>", 502));

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("EXTERNAL_SERVICE_ERROR");
  });

  it("ne plante pas sur un 504 HTML", async () => {
    mockFetch(async () => htmlResponse("<html>Timeout</html>", 504));

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("REQUEST_TIMEOUT");
  });

  it("ne plante pas sur un 413 (fichier trop lourd rejeté par la plateforme)", async () => {
    mockFetch(async () => htmlResponse("<html>Payload Too Large</html>", 413));

    const result = await safeFetch("/api/x", { method: "POST" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("UPLOAD_FAILED");
    expect(result.error.message).toContain("fichier");
  });

  it("ne plante pas sur une réponse tronquée (JSON invalide)", async () => {
    mockFetch(
      async () =>
        new Response('{"products": [{"id": "p1"', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_RESPONSE");
  });

  it("refuse un 200 HTML au lieu de le prendre pour un succès", async () => {
    mockFetch(async () => htmlResponse("<html>login</html>", 200));

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("BAD_RESPONSE");
  });

  it("accepte un JSON annoncé avec un Content-Type exotique", async () => {
    mockFetch(
      async () =>
        new Response('{"ok":true}', {
          status: 200,
          headers: { "Content-Type": "application/vnd.api+json" },
        }),
    );

    const result = await safeFetch<{ ok: boolean }>("/api/x");

    expect(result.ok).toBe(true);
  });
});

describe("safeFetch — réseau instable", () => {
  it("convertit une coupure réseau en NETWORK_UNAVAILABLE", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NETWORK_UNAVAILABLE");
    expect(result.error.status).toBeNull();
    expect(result.error.retryable).toBe(true);
  });

  it("abandonne au bout du délai imparti", async () => {
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const result = await safeFetch("/api/x", { timeoutMs: 20 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("REQUEST_TIMEOUT");
    expect(result.error.retryable).toBe(true);
  });

  it("distingue une annulation volontaire d'un délai dépassé", async () => {
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const controller = new AbortController();
    const pending = safeFetch("/api/x", {
      timeoutMs: 5_000,
      signal: controller.signal,
    });
    controller.abort();

    const result = await pending;

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("REQUEST_ABORTED");
    expect(result.error.retryable).toBe(false);
  });

  it("ne demande jamais de réessayer une erreur 401 ou 403", async () => {
    mockFetch(async () => jsonResponse({ error: "Non autorisé" }, 401));

    const result = await safeFetch("/api/x");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.retryable).toBe(false);
  });

  it("ne rejette jamais : la promesse se résout toujours", async () => {
    mockFetch(async () => {
      throw new Error("erreur totalement inattendue");
    });

    await expect(safeFetch("/api/x")).resolves.toBeDefined();
  });
});
