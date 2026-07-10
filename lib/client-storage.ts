import type { ClientInfo } from "@/types/order";

const CLIENT_STORAGE_KEY = "ah-mes-gouts-client";

const emptyClient: ClientInfo = {
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  landmark: "",
  message: "",
};

export function loadSavedClient(): ClientInfo | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientInfo;
    if (!parsed.phone) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveClient(info: ClientInfo): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(info));
}

export function getEmptyClient(): ClientInfo {
  return { ...emptyClient };
}

export function getClientFirstName(info: ClientInfo): string {
  return info.firstName.trim() || info.lastName.trim().split(" ")[0] || "";
}
