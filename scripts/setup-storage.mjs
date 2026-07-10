import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(__dirname, "../.env"));
loadEnvFile(join(__dirname, "../.env.local"));

async function main() {
  const prisma = new PrismaClient();
  const sql = readFileSync(
    join(__dirname, "../supabase/migrations/20260702120000_cms_images_bucket.sql"),
    "utf-8",
  );
  await prisma.$executeRawUnsafe(sql);
  await prisma.$disconnect();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("BUCKET_SQL_OK (skip upload test — clés Supabase absentes)");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const path = `cms/test-${Date.now()}.png`;
  const { error } = await supabase.storage.from("cms-images").upload(path, png, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("cms-images").getPublicUrl(path);
  console.log("STORAGE_UPLOAD_OK", data.publicUrl);
  await supabase.storage.from("cms-images").remove([path]);
  console.log("STORAGE_CLEANUP_OK");
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
