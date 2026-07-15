const DEVICE_STORAGE_KEY = "ah-mes-gouts-device";

function createDeviceKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `amg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Identifiant appareil persistant (LocalStorage). Régénéré seulement si cache vidé. */
export function getOrCreateDeviceKey(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY)?.trim();
    if (existing && existing.length >= 16) return existing;

    const next = createDeviceKey();
    window.localStorage.setItem(DEVICE_STORAGE_KEY, next);
    return next;
  } catch {
    return createDeviceKey();
  }
}

export function peekDeviceKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DEVICE_STORAGE_KEY);
  } catch {
    return null;
  }
}
