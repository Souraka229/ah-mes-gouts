import { randomUUID } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "cms-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type UploadResult = {
  url: string;
  provider: "supabase" | "local";
};

/**
 * Secours dev uniquement : en production le disque est en lecture seule (et le
 * fichier disparaîtrait au déploiement suivant) — mieux vaut échouer clairement
 * que d'enregistrer une URL qui ne s'affichera jamais.
 */
async function uploadLocal(file: File): Promise<UploadResult> {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Stockage d'images indisponible : vérifiez la configuration Supabase.",
    );
  }
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const dir = path.join(process.cwd(), "public", "images", "uploads");
  mkdirSync(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(path.join(dir, filename), buffer);
  return { url: `/images/uploads/${filename}`, provider: "local" };
}

export async function uploadSiteImage(file: File): Promise<UploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Type de fichier non autorisé (JPEG, PNG, WebP, GIF)");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Fichier trop volumineux (max 5 Mo)");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error("[upload] SUPABASE_SERVICE_ROLE_KEY absent — pas de stockage distant.");
    return uploadLocal(file);
  }

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const objectPath = `cms/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    console.error("[upload] Supabase Storage a refusé le fichier:", error);
    return uploadLocal(file);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return { url: data.publicUrl, provider: "supabase" };
}
