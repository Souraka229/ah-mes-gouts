import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

import { createDefaultSiteContentStore } from "@/lib/site-content-defaults";
import { validateSectionContent } from "@/lib/validation/site-content";
import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import { getPrisma } from "@/lib/prisma";
import type {
  PageSection,
  SectionKey,
  SectionVersionSnapshot,
  SiteContentStore,
  SitePageId,
} from "@/types/site-content";

const STORE_ID = "default";
const MAX_HISTORY_PER_SECTION = 10;

declare global {
  var __amgSiteContent: SiteContentStore | undefined;
}

async function readFromDb(): Promise<SiteContentStore | null> {
  try {
    const prisma = getPrisma();
    const row = await prisma.siteContentStore.findUnique({
      where: { id: STORE_ID },
    });
    if (!row) return null;
    return row.data as unknown as SiteContentStore;
  } catch {
    return null;
  }
}

async function writeToDb(store: SiteContentStore): Promise<void> {
  try {
    const prisma = getPrisma();
    const data = store as unknown as Prisma.InputJsonValue;
    await prisma.siteContentStore.upsert({
      where: { id: STORE_ID },
      create: { id: STORE_ID, data },
      update: { data },
    });
  } catch {
    // Mode dégradé sans Postgres — store mémoire uniquement
  }
}

export async function getSiteContentStore(): Promise<SiteContentStore> {
  if (globalThis.__amgSiteContent) return globalThis.__amgSiteContent;
  const fromDb = await readFromDb();
  const store = fromDb ?? createDefaultSiteContentStore();
  if (!fromDb) await writeToDb(store);
  globalThis.__amgSiteContent = store;
  return store;
}

export async function getPublishedSections(
  page: SitePageId,
): Promise<PageSection[]> {
  const store = await getSiteContentStore();
  return store.published
    .filter((s) => s.page === page && s.isVisible)
    .sort((a, b) => a.order - b.order);
}

export async function getAdminPageSections(
  page: SitePageId,
): Promise<{ published: PageSection[]; drafts: PageSection[] }> {
  const store = await getSiteContentStore();
  const filter = (list: PageSection[]) =>
    list.filter((s) => s.page === page).sort((a, b) => a.order - b.order);
  return {
    published: filter(store.published),
    drafts: filter(store.drafts),
  };
}

export function getSectionByKey<K extends SectionKey>(
  sections: PageSection[],
  key: K,
): PageSection<K> | undefined {
  return sections.find((s) => s.sectionKey === key) as PageSection<K> | undefined;
}

export async function updateDraftSection(
  sectionId: string,
  patch: Partial<Pick<PageSection, "isVisible" | "order" | "content">>,
): Promise<PageSection> {
  const store = await getSiteContentStore();
  const idx = store.drafts.findIndex((s) => s.id === sectionId);
  if (idx === -1) throw new Error("Section introuvable");

  const current = store.drafts[idx]!;
  if (patch.content !== undefined) {
    const parsed = validateSectionContent(current.sectionKey, patch.content);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Contenu invalide");
    }
    current.content = parsed.data as PageSection["content"];
  }
  if (patch.isVisible !== undefined) current.isVisible = patch.isVisible;
  if (patch.order !== undefined) current.order = patch.order;
  current.updatedAt = new Date().toISOString();

  store.drafts[idx] = current;
  globalThis.__amgSiteContent = store;
  await writeToDb(store);
  return current;
}

export async function reorderDraftSections(
  page: SitePageId,
  orderedIds: string[],
): Promise<PageSection[]> {
  const store = await getSiteContentStore();
  const pageDrafts = store.drafts.filter((s) => s.page === page);
  const idSet = new Set(orderedIds);
  if (idSet.size !== pageDrafts.length) {
    throw new Error("Liste de réordonnancement incomplète");
  }

  orderedIds.forEach((id, order) => {
    const section = store.drafts.find((s) => s.id === id);
    if (section) {
      section.order = order;
      section.updatedAt = new Date().toISOString();
    }
  });

  globalThis.__amgSiteContent = store;
  await writeToDb(store);
  return store.drafts
    .filter((s) => s.page === page)
    .sort((a, b) => a.order - b.order);
}

export async function publishPageDrafts(page: SitePageId): Promise<PageSection[]> {
  const store = await getSiteContentStore();
  const adminName = await getAdminDisplayNameAsync();
  const now = new Date().toISOString();

  const pageDrafts = store.drafts.filter((s) => s.page === page);

  for (const draft of pageDrafts) {
    const parsed = validateSectionContent(draft.sectionKey, draft.content);
    if (!parsed.success) {
      throw new Error(
        `Section ${draft.sectionKey} : ${parsed.error.issues[0]?.message}`,
      );
    }

    const pubIdx = store.published.findIndex((s) => s.id === draft.id);
    const published: PageSection = {
      ...draft,
      content: parsed.data as PageSection["content"],
      updatedAt: now,
    };

    if (pubIdx === -1) {
      store.published.push(published);
    } else {
      store.published[pubIdx] = published;
    }

    const snapshot: SectionVersionSnapshot = {
      id: randomUUID(),
      sectionId: draft.id,
      sectionKey: draft.sectionKey,
      page: draft.page,
      content: structuredClone(published.content),
      publishedAt: now,
      publishedBy: adminName,
    };

    store.history = [
      snapshot,
      ...store.history.filter((h) => h.sectionId !== draft.id),
    ].slice(0, MAX_HISTORY_PER_SECTION * 20);
  }

  globalThis.__amgSiteContent = store;
  await writeToDb(store);

  await appendAdminActionLog({
    adminName,
    source: "manual",
    action: "publish_site_content",
    summary: `Publication du contenu — page ${page}`,
    details: { page, sectionCount: pageDrafts.length },
  });

  return store.published
    .filter((s) => s.page === page)
    .sort((a, b) => a.order - b.order);
}

export async function getSectionHistory(
  sectionId: string,
): Promise<SectionVersionSnapshot[]> {
  const store = await getSiteContentStore();
  return store.history
    .filter((h) => h.sectionId === sectionId)
    .slice(0, MAX_HISTORY_PER_SECTION);
}

export async function restoreSectionVersion(
  versionId: string,
): Promise<PageSection> {
  const store = await getSiteContentStore();
  const version = store.history.find((h) => h.id === versionId);
  if (!version) throw new Error("Version introuvable");

  const draft = store.drafts.find((s) => s.id === version.sectionId);
  if (!draft) throw new Error("Section introuvable");

  draft.content = structuredClone(version.content);
  draft.updatedAt = new Date().toISOString();

  globalThis.__amgSiteContent = store;
  await writeToDb(store);
  return draft;
}
