import type { Prisma } from "@prisma/client";

import { createDefaultSiteSettings } from "@/lib/site-content-defaults";
import { siteSettingsSchema } from "@/lib/validation/site-content";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import { getPrisma } from "@/lib/prisma";
import type { SiteSettings } from "@/types/site-content";

const STORE_ID = "default";

declare global {
  var __amgSiteSettings: SiteSettings | undefined;
}

async function readFromDb(): Promise<SiteSettings | null> {
  const prisma = getPrisma();
  const row = await prisma.siteSettingsStore.findUnique({ where: { id: STORE_ID } });
  if (!row) return null;
  return row.data as unknown as SiteSettings;
}

async function writeToDb(settings: SiteSettings): Promise<void> {
  const prisma = getPrisma();
  const data = settings as unknown as Prisma.InputJsonValue;
  await prisma.siteSettingsStore.upsert({
    where: { id: STORE_ID },
    create: { id: STORE_ID, data },
    update: { data },
  });
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (globalThis.__amgSiteSettings) return globalThis.__amgSiteSettings;
  const fromDb = await readFromDb();
  const settings = fromDb ?? createDefaultSiteSettings();
  if (!fromDb) await writeToDb(settings);
  globalThis.__amgSiteSettings = settings;
  return settings;
}

export async function updateSiteSettings(
  patch: Partial<Omit<SiteSettings, "updatedAt">>,
): Promise<SiteSettings> {
  const current = await getSiteSettings();
  const merged = {
    ...current,
    ...patch,
    brandColors: patch.brandColors
      ? { ...current.brandColors, ...patch.brandColors }
      : current.brandColors,
    notificationTemplates:
      patch.notificationTemplates ?? current.notificationTemplates,
    updatedAt: new Date().toISOString(),
  };

  const parsed = siteSettingsSchema.safeParse(merged);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Paramètres invalides");
  }

  const finalSettings: SiteSettings = {
    ...parsed.data,
    updatedAt: merged.updatedAt,
  };

  globalThis.__amgSiteSettings = finalSettings;
  await writeToDb(finalSettings);

  await appendAdminActionLog({
    adminName: await getAdminDisplayNameAsync(),
    source: "manual",
    action: "update_site_settings",
    summary: "Mise à jour des paramètres globaux",
  });

  return finalSettings;
}
