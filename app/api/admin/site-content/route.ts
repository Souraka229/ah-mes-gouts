import { NextResponse } from "next/server";

import { isAdministratorAsync } from "@/lib/server/admin-role";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import {
  getAdminPageSections,
  getSectionHistory,
  publishPageDrafts,
  reorderDraftSections,
  restoreSectionVersion,
  updateDraftSection,
} from "@/lib/server/site-content-repository";
import type { PageSection, SitePageId } from "@/types/site-content";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  if (!(await isAdminAuthorizedAsync()) || !(await isAdministratorAsync())) {
    return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await assertAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const page = (searchParams.get("page") ?? "home") as SitePageId;

  const data = await getAdminPageSections(page);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(request: Request) {
  const denied = await assertAdmin();
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      sectionId?: string;
      isVisible?: boolean;
      order?: number;
      content?: unknown;
    };

    if (!body.sectionId) {
      return NextResponse.json({ error: "sectionId requis" }, { status: 400 });
    }

    const section = await updateDraftSection(body.sectionId, {
      isVisible: body.isVisible,
      order: body.order,
      ...(body.content !== undefined ? { content: body.content as PageSection["content"] } : {}),
    });

    return NextResponse.json({ section });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const denied = await assertAdmin();
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      action?: string;
      page?: SitePageId;
      orderedIds?: string[];
      versionId?: string;
      sectionId?: string;
    };

    if (body.action === "publish" && body.page) {
      const sections = await publishPageDrafts(body.page);
      return NextResponse.json({ sections });
    }

    if (body.action === "reorder" && body.page && body.orderedIds) {
      const sections = await reorderDraftSections(body.page, body.orderedIds);
      return NextResponse.json({ sections });
    }

    if (body.action === "restore" && body.versionId) {
      const section = await restoreSectionVersion(body.versionId);
      return NextResponse.json({ section });
    }

    if (body.action === "history" && body.sectionId) {
      const history = await getSectionHistory(body.sectionId);
      return NextResponse.json({ history });
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
