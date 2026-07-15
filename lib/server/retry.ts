export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  label?: string;
  /**
   * Renvoie false pour rejeter immédiatement (erreur métier non transitoire) :
   * l'erreur d'origine est relancée telle quelle, sans réessai ni enrobage.
   */
  shouldRetry?: (error: unknown) => boolean;
};

/**
 * Retry avec backoff exponentiel pour opérations critiques (commande, stock, persistance).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const label = options.label ?? "operation";
  const shouldRetry = options.shouldRetry ?? (() => true);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Erreur métier (ex. stock insuffisant) : rejet immédiat, sans enrobage.
      if (!shouldRetry(error)) throw error;
      if (attempt === maxAttempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Erreur inconnue";

  throw new Error(
    `[${label}] Échec après ${maxAttempts} tentatives : ${message}`,
  );
}
