import { randomUUID } from "crypto";

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
  provider: "supabase";
};

export async function uploadSiteImage(file: File): Promise<UploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Type de fichier non autorisé (JPEG, PNG, WebP, GIF)");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Fichier trop volumineux (max 5 Mo)");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error(
      "Supabase non configuré — ajoutez SUPABASE_SERVICE_ROLE_KEY dans les variables d'environnement.",
    );
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
    throw new Error(`Échec de l'upload Supabase : ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return { url: data.publicUrl, provider: "supabase" };
}
