declare global {
  var __amgOrderIdempotency: Map<string, { orderId: string; at: string }> | undefined;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function getIdempotencyStore(): Map<string, { orderId: string; at: string }> {
  if (!globalThis.__amgOrderIdempotency) {
    globalThis.__amgOrderIdempotency = new Map();
  }
  return globalThis.__amgOrderIdempotency;
}

export function resolveIdempotentOrder(
  key: string,
): { orderId: string } | null {
  const store = getIdempotencyStore();
  const entry = store.get(key);
  if (!entry) return null;

  const age = Date.now() - new Date(entry.at).getTime();
  if (age > IDEMPOTENCY_TTL_MS) {
    store.delete(key);
    return null;
  }

  return { orderId: entry.orderId };
}

export function rememberIdempotentOrder(key: string, orderId: string): void {
  getIdempotencyStore().set(key, {
    orderId,
    at: new Date().toISOString(),
  });
}
