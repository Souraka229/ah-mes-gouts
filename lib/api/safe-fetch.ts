/**
 * `safeFetch` — le seul point d'entrée réseau autorisé côté client.
 *
 * Pourquoi cette fonction existe : `response.json()` lancé sans précaution
 * explose dès que le corps n'est pas du JSON — page d'erreur HTML de Vercel,
 * 413 « Request Entity Too Large », 504 de passerelle, réponse 204 vide,
 * coupure réseau en cours de transfert. L'utilisateur voyait alors
 * « Unexpected end of JSON input » au lieu de « Impossible de charger les
 * produits ».
 *
 * Garanties :
 *  1. `.json()` n'est JAMAIS appelé à l'aveugle. On lit le corps en texte,
 *     on vérifie le `Content-Type` et la vacuité avant de parser.
 *  2. Aucune exception ne fuit : la fonction retourne toujours un résultat
 *     discriminé (`ok: true` / `ok: false`).
 *  3. Un échec ne peut pas être confondu avec un succès vide : `empty` est
 *     un succès explicite, `ok: false` est une erreur explicite.
 *  4. Toute requête a un délai maximal — sans lui, une connexion instable
 *     laisse l'écran bloqué indéfiniment.
 */

import { AppError, codeForStatus, isTechnicalMessage } from "./errors";

/** Délai par défaut. Au-delà, l'utilisateur a déjà décroché. */
export const DEFAULT_TIMEOUT_MS = 15_000;

export type SafeFetchSuccess<T> = {
  ok: true;
  status: number;
  data: T;
  /** Le serveur a répondu sans corps (204/205, ou corps vide). */
  empty: boolean;
  requestId: string | null;
};

export type SafeFetchFailure = {
  ok: false;
  status: number | null;
  error: AppError;
  requestId: string | null;
  /**
   * Corps JSON déjà analysé, quand le serveur en a renvoyé un.
   *
   * `error.message` ne transporte qu'une phrase. Or certaines routes joignent
   * à `error` des détails exploitables — `nextSlot` sur un conflit de créneau,
   * `issues` sur un panier refusé — qu'aucun message ne peut véhiculer.
   * Les rendre ici évite à ces appelants de relire la réponse eux-mêmes.
   */
  body: unknown;
};

export type SafeFetchResult<T> = SafeFetchSuccess<T> | SafeFetchFailure;

export type SafeFetchOptions = Omit<RequestInit, "signal"> & {
  /** Délai maximal en millisecondes. */
  timeoutMs?: number;
  /** Signal d'annulation de l'appelant (démontage de composant, refetch…). */
  signal?: AbortSignal | null;
  /**
   * Corps JSON : sérialise et pose l'en-tête automatiquement.
   * Évite l'oubli du `Content-Type`, qui produit un 400 illisible.
   */
  json?: unknown;
  /**
   * L'appel attend une charge utile. Un 2xx à corps vide devient alors une
   * erreur, au lieu d'un « succès » que l'appelant lirait comme une liste vide.
   *
   * C'est ce qui évite qu'une route cassée se traduise par « catalogue vide »
   * plutôt que par « impossible de charger ».
   */
  requireJson?: boolean;
};

function readRequestId(response: Response): string | null {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("x-vercel-id") ??
    null
  );
}

/**
 * Extrait un message exploitable d'un corps déjà parsé.
 *
 * Nos routes renvoient `{ error: "..." }` ; le contrat cible renvoie
 * `{ error: { code, message } }`. On accepte les deux, sans jamais faire
 * confiance au contenu.
 */
function extractServerMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const error = (body as { error?: unknown }).error;

  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed && !isTechnicalMessage(trimmed) ? trimmed : null;
  }
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      const trimmed = message.trim();
      return trimmed && !isTechnicalMessage(trimmed) ? trimmed : null;
    }
  }
  const message = (body as { message?: unknown }).message;
  if (typeof message === "string") {
    const trimmed = message.trim();
    return trimmed && !isTechnicalMessage(trimmed) ? trimmed : null;
  }
  return null;
}

const JSON_TYPE = /^application\/(?:[\w.+-]+\+)?json\b/i;

export async function safeFetch<T = unknown>(
  input: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult<T>> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    json,
    headers,
    requireJson = false,
    ...init
  } = options;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  // Relaie l'annulation de l'appelant sans écraser la nôtre.
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  const finalHeaders = new Headers(headers);
  let body = init.body;
  if (json !== undefined) {
    if (!finalHeaders.has("Content-Type")) {
      finalHeaders.set("Content-Type", "application/json");
    }
    body = JSON.stringify(json);
  }

  try {
    const response = await fetch(input, {
      ...init,
      body,
      headers: finalHeaders,
      signal: controller.signal,
      // Le back-office ne doit jamais servir une réponse mise en cache.
      cache: init.cache ?? "no-store",
    });

    const requestId = readRequestId(response);
    const raw = await response.text();
    const isEmptyBody = raw.trim().length === 0;
    const contentType = response.headers.get("content-type") ?? "";
    const looksJson = JSON_TYPE.test(contentType);

    // Corps vide : un 2xx est un succès sans données, un 4xx/5xx est une erreur.
    if (isEmptyBody) {
      if (response.ok && !requireJson) {
        return {
          ok: true,
          status: response.status,
          data: null as T,
          empty: true,
          requestId,
        };
      }
      if (response.ok) {
        // Une charge utile était attendue : un corps vide est une anomalie,
        // pas une liste vide.
        return {
          ok: false,
          status: response.status,
          error: new AppError("BAD_RESPONSE", {
            status: response.status,
            requestId,
          }),
          requestId,
          body: null,
        };
      }
      return {
        ok: false,
        status: response.status,
        error: new AppError(codeForStatus(response.status), {
          status: response.status,
          requestId,
        }),
        requestId,
        body: null,
      };
    }

    let parsed: unknown = null;
    let parseFailed = false;

    if (looksJson) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parseFailed = true;
      }
    }

    if (!response.ok) {
      // Le corps n'est pas du JSON (page HTML de Vercel, par exemple) :
      // on se rabat sur le statut, sans jamais exposer le HTML.
      const serverMessage = parseFailed ? null : extractServerMessage(parsed);
      return {
        ok: false,
        status: response.status,
        error: new AppError(codeForStatus(response.status), {
          status: response.status,
          message: serverMessage ?? undefined,
          requestId,
        }),
        requestId,
        body: parseFailed ? null : parsed,
      };
    }

    // Succès HTTP mais corps illisible : ce n'est pas un succès.
    if (!looksJson || parseFailed) {
      return {
        ok: false,
        status: response.status,
        error: new AppError("BAD_RESPONSE", { status: response.status, requestId }),
        requestId,
        body: null,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsed as T,
      empty: false,
      requestId,
    };
  } catch (cause) {
    const requestId = null;

    if (cause instanceof DOMException && cause.name === "AbortError") {
      return {
        ok: false,
        status: null,
        error: new AppError(timedOut ? "REQUEST_TIMEOUT" : "REQUEST_ABORTED", {
          cause,
        }),
        requestId,
        body: null,
      };
    }

    // `fetch` rejette un TypeError quand le réseau lâche.
    if (cause instanceof TypeError) {
      return {
        ok: false,
        status: null,
        error: new AppError("NETWORK_UNAVAILABLE", { cause }),
        requestId,
        body: null,
      };
    }

    return {
      ok: false,
      status: null,
      error: new AppError("UNKNOWN", { cause }),
      requestId,
      body: null,
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
