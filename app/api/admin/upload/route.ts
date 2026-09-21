import { NextResponse } from "next/server";
import { z } from "zod";

import { appendAdminActionLog } from "@/lib/server/admin-action-log";
import { isAdminAuthorizedAsync } from "@/lib/server/admin-auth";
import { getAdminDisplayNameAsync } from "@/lib/server/admin-role";
import { deleteSiteImage, uploadSiteImage } from "@/lib/server/image-upload";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    const result = await uploadSiteImage(file);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload échoué";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const deleteSchema = z.object({ url: z.string().trim().min(1).max(600) });

/**
 * Supprime un visuel téléversé.
 *
 * Jusqu'ici, retirer une photo était **impossible** : l'API n'exposait que
 * POST, et les fichiers s'accumulaient dans le stockage sans jamais être
 * nettoyés. Le garde-fou est dans `deleteSiteImage` : seuls les envois de
 * l'admin sont supprimables, jamais les photos livrées avec le site.
 */
export async function DELETE(request: Request) {
  if (!(await isAdminAuthorizedAsync())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Adresse manquante" }, { status: 400 });
    }

    const result = await deleteSiteImage(parsed.data.url);

    void appendAdminActionLog({
      adminName: await getAdminDisplayNameAsync(),
      source: "manual",
      action: "image_delete",
      summary: `Image supprimée (${result.provider})`,
      details: { url: parsed.data.url },
    });

    return NextResponse.json({ ok: true, provider: result.provider });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Suppression impossible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
