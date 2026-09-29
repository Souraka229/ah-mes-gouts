/**
 * Taxonomie d'erreurs partagée front/back.
 *
 * Objectif : ne jamais laisser une exception technique atteindre l'écran.
 * Chaque erreur porte deux choses distinctes :
 *  - `code`    : identifiant technique stable, pour les logs et le support ;
 *  - `message` : phrase en français, affichable telle quelle à l'utilisateur.
 *
 * La règle du dépôt : une erreur ne se transforme JAMAIS en succès, et un
 * échec ne s'affiche JAMAIS comme « vide » ou « 0 ».
 */

export type AppErrorCode =
  | "NETWORK_UNAVAILABLE"
  | "REQUEST_TIMEOUT"
  | "REQUEST_ABORTED"
  | "BAD_RESPONSE"
  | "VALIDATION_FAILED"
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "DATABASE_ERROR"
  | "EXTERNAL_SERVICE_ERROR"
  | "UPLOAD_FAILED"
  | "PAYMENT_FAILED"
  | "SERVER_ERROR"
  | "UNKNOWN";

/** Statuts HTTP → code d'erreur. Couvre ce que renvoient nos routes et Vercel. */
const STATUS_TO_CODE: Record<number, AppErrorCode> = {
  400: "VALIDATION_FAILED",
  401: "AUTHENTICATION_REQUIRED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "UPLOAD_FAILED",
  422: "VALIDATION_FAILED",
  429: "RATE_LIMITED",
  500: "SERVER_ERROR",
  502: "EXTERNAL_SERVICE_ERROR",
  503: "EXTERNAL_SERVICE_ERROR",
  504: "REQUEST_TIMEOUT",
};

/**
 * Messages affichables. Volontairement tournés vers l'action : on dit à
 * l'utilisateur quoi faire, pas ce qui a cassé techniquement.
 */
const CODE_TO_MESSAGE: Record<AppErrorCode, string> = {
  NETWORK_UNAVAILABLE:
    "Connexion perdue. Vérifiez votre réseau puis réessayez.",
  REQUEST_TIMEOUT:
    "Le serveur met trop de temps à répondre. Réessayez dans un instant.",
  REQUEST_ABORTED: "Opération annulée.",
  BAD_RESPONSE:
    "Réponse inattendue du serveur. Réessayez ; si cela persiste, prévenez le support.",
  VALIDATION_FAILED: "Les informations envoyées sont incomplètes ou invalides.",
  AUTHENTICATION_REQUIRED:
    "Votre session a expiré. Reconnectez-vous pour continuer.",
  FORBIDDEN: "Vous n'avez pas les droits pour cette action.",
  NOT_FOUND: "Cet élément n'existe plus.",
  CONFLICT:
    "Cet enregistrement a été modifié entre-temps. Rechargez avant de réessayer.",
  RATE_LIMITED: "Trop de tentatives. Patientez quelques secondes.",
  DATABASE_ERROR: "Impossible d'enregistrer pour le moment. Réessayez.",
  EXTERNAL_SERVICE_ERROR:
    "Un service externe ne répond pas. Réessayez dans un instant.",
  UPLOAD_FAILED:
    "L'envoi du fichier a échoué. Vérifiez son format et sa taille.",
  PAYMENT_FAILED: "Le paiement n'a pas abouti.",
  SERVER_ERROR: "Erreur inattendue de notre côté. Réessayez.",
  UNKNOWN: "Une erreur inattendue est survenue.",
};

/**
 * Une erreur qu'on peut montrer à l'utilisateur sans la traduire.
 *
 * `retryable` pilote l'affichage du bouton « Réessayer » : on ne propose pas
 * de réessayer une action qui échouera à l'identique (401, 403, 404).
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number | null;
  readonly retryable: boolean;
  readonly requestId: string | null;

  constructor(
    code: AppErrorCode,
    options: {
      status?: number | null;
      /** Message serveur plus précis, prioritaire s'il est exploitable. */
      message?: string;
      cause?: unknown;
      requestId?: string | null;
    } = {},
  ) {
    super(options.message?.trim() || CODE_TO_MESSAGE[code]);
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? null;
    this.requestId = options.requestId ?? null;
    this.retryable = isRetryableCode(code, this.status);
    if (options.cause !== undefined) this.cause = options.cause;
  }

  /** Forme sérialisable, alignée sur le contrat d'API (`error` objet). */
  toPayload(): {
    code: AppErrorCode;
    message: string;
    retryable: boolean;
  } {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

function isRetryableCode(code: AppErrorCode, status: number | null): boolean {
  // Un 4xx « définitif » ne se répare pas en réessayant.
  if (status === 401 || status === 403 || status === 404 || status === 422) {
    return false;
  }
  if (code === "REQUEST_ABORTED") return false;
  if (code === "VALIDATION_FAILED" && status === 400) return false;
  return true;
}

export function codeForStatus(status: number): AppErrorCode {
  if (STATUS_TO_CODE[status]) return STATUS_TO_CODE[status];
  if (status >= 500) return "SERVER_ERROR";
  if (status >= 400) return "VALIDATION_FAILED";
  return "UNKNOWN";
}

export function messageForCode(code: AppErrorCode): string {
  return CODE_TO_MESSAGE[code];
}

/**
 * Rend n'importe quoi affichable.
 *
 * Utilisé dans les `catch` de l'UI : plus aucun `catch {}` muet, et plus
 * jamais de message technique brut (`Unexpected end of JSON input`) à l'écran.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // Erreurs natives du navigateur, qu'on sait reconnaître.
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AppError("REQUEST_ABORTED", { cause: error });
  }
  if (error instanceof TypeError) {
    // `fetch` rejette un TypeError sur coupure réseau / DNS / CORS.
    return new AppError("NETWORK_UNAVAILABLE", { cause: error });
  }

  if (error instanceof Error) {
    // Un message écrit à la main dans le code (`throw new Error("Catégorie
    // invalide")`) est plus utile que le libellé générique. Un message
    // technique (`Unexpected end of JSON input`) ne doit jamais passer.
    const message = isTechnicalMessage(error.message) ? undefined : error.message;
    return new AppError("UNKNOWN", { message, cause: error });
  }

  return new AppError("UNKNOWN", { cause: error });
}

/** Message prêt à afficher, quelle que soit l'entrée. */
export function toUserMessage(error: unknown): string {
  return toAppError(error).message;
}

/**
 * Détecte les messages techniques qui ne doivent jamais atteindre l'écran.
 * Sert de dernier filet : si un message ressemble à une fuite d'implémentation,
 * on le remplace par le libellé générique.
 */
export function isTechnicalMessage(message: string): boolean {
  return (
    /Unexpected end of JSON|Failed to execute 'json'|JSON\.parse/i.test(message) ||
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|PrismaClient|P20\d\d|P10\d\d/i.test(message) ||
    /at\s+\w+\s+\(.*:\d+:\d+\)/.test(message)
  );
}
