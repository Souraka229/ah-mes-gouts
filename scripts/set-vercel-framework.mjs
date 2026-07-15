/**
 * Corrige le Framework Preset du projet Vercel vers Next.js
 * (le create via `vercel project add` laisse "Other" + output public).
 * Usage: node scripts/set-vercel-framework.mjs
 */
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

function findAuthToken() {
  const candidates = [
    join(homedir(), "AppData", "Roaming", "com.vercel.cli", "Data", "auth.json"),
    join(homedir(), "AppData", "Roaming", "com.vercel.cli", "auth.json"),
    join(homedir(), "AppData", "Local", "com.vercel.cli", "auth.json"),
    join(homedir(), ".local", "share", "com.vercel.cli", "auth.json"),
    join(homedir(), ".config", "com.vercel.cli", "auth.json"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const data = JSON.parse(readFileSync(path, "utf8"));
      const token = data.token || data.authToken;
      if (typeof token === "string" && token.length > 10) return token;
    } catch {
      /* continue */
    }
  }
  return null;
}

const projectJson = JSON.parse(
  readFileSync(join(process.cwd(), ".vercel", "project.json"), "utf8"),
);
const projectId = projectJson.projectId;
const teamId = projectJson.orgId;
const token = findAuthToken();

if (!token) {
  console.error("Token Vercel introuvable — lance vercel login");
  process.exit(1);
}

const url = `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`;

const res = await fetch(url, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    framework: "nextjs",
    buildCommand: "prisma generate && next build",
    outputDirectory: null,
    installCommand: "npm install",
    nodeVersion: "24.x",
  }),
});

if (!res.ok) {
  const body = await res.text();
  console.error("PATCH failed", res.status, body.slice(0, 300));
  process.exit(1);
}

const data = await res.json();
console.log("✓ Projet mis à jour :", data.name);
console.log("  framework:", data.framework);
console.log("  nodeVersion:", data.nodeVersion);
