import type { Prisma } from "@prisma/client";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import { getPrisma } from "@/lib/prisma";
import {
  DEFAULT_BOUTIQUE_SETTINGS,
  type BoutiqueSettings,
} from "@/types/boutique";

const STORE_ID = "default";

declare global {
  var __amgBoutiqueSettings: BoutiqueSettings | undefined;
}

export function getBoutiqueSettingsSync(): BoutiqueSettings | undefined {
  return globalThis.__amgBoutiqueSettings;
}

async function readFromDb(): Promise<BoutiqueSettings | null> {
  const prisma = getPrisma();
  const row = await prisma.siteSettingsStore.findUnique({
    where: { id: STORE_ID },
  });
  if (!row) return null;
  return { ...DEFAULT_BOUTIQUE_SETTINGS, ...(row.data as object) };
}

async function writeToDb(settings: BoutiqueSettings): Promise<void> {
  const prisma = getPrisma();
  const data = settings as unknown as Prisma.InputJsonValue;
  await prisma.siteSettingsStore.upsert({
    where: { id: STORE_ID },
    create: { id: STORE_ID, data },
    update: { data },
  });
}

export async function getBoutiqueSettings(): Promise<BoutiqueSettings> {
  if (globalThis.__amgBoutiqueSettings) return globalThis.__amgBoutiqueSettings;
  const fromDb = await readFromDb();
  const settings = fromDb ?? DEFAULT_BOUTIQUE_SETTINGS;
  if (!fromDb) await writeToDb(settings);
  globalThis.__amgBoutiqueSettings = settings;
  return settings;
}

export async function saveBoutiqueSettings(
  patch: Partial<Omit<BoutiqueSettings, "updatedAt">>,
): Promise<BoutiqueSettings> {
  const current = await getBoutiqueSettings();
  const next: BoutiqueSettings = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  globalThis.__amgBoutiqueSettings = next;
  await writeToDb(next);

  await appendAdminActionLog({
    adminName: await getAdminDisplayNameAsync(),
    source: "manual",
    action: "update_boutique_settings",
    summary: "Mise à jour des infos boutique",
  });

  return next;
}
