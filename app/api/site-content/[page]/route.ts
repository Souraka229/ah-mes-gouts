import { NextResponse } from "next/server";

import { getPublishedSections } from "@/lib/server/site-content-repository";
import type { SitePageId } from "@/types/site-content";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page } = await params;
  const sections = await getPublishedSections(page as SitePageId);
  return NextResponse.json(
    { page, sections },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
