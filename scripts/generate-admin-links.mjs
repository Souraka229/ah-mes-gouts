/** Génère des tokens admin et affiche les liens magiques — node scripts/generate-admin-links.mjs */
import { randomBytes } from "crypto";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const daysValid = Number(process.argv[3] ?? "90");

const expiresAt = new Date(
  Date.now() + Math.max(1, daysValid) * 24 * 60 * 60 * 1000,
).toISOString();

const tokens = [
  {
    id: "fondateur",
    token: `amg_${randomBytes(24).toString("hex")}`,
    role: "administrateur",
    name: "Fondateur",
    expiresAt,
  },
  {
    id: "employe-cotonou",
    token: `amg_${randomBytes(24).toString("hex")}`,
    role: "employe",
    name: "Équipe Cotonou",
    expiresAt,
  },
];

console.log("\n=== ADMIN_ACCESS_TOKENS (.env.local) ===\n");
console.log(`ADMIN_ACCESS_TOKENS='${JSON.stringify(tokens)}'\n`);

console.log(`Durée de vie : ${daysValid} jours (expiresAt inclus).\n`);
console.log(
  "Révocation individuelle : ajouter \"revokedAt\":\"2026-07-15T00:00:00.000Z\" sur l'entrée sans toucher les autres.\n",
);

console.log("=== Liens magiques ===\n");
for (const entry of tokens) {
  const url = new URL("/admin/entree", baseUrl);
  url.searchParams.set("token", entry.token);
  console.log(`${entry.name} (${entry.role}) — expire ${entry.expiresAt}`);
  console.log(url.toString());
  console.log("");
}

console.log(
  "Déconnexion : DELETE /api/admin/auth ou supprimer le cookie amg_admin_session\n",
);
