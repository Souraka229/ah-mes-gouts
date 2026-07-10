/** Génère des tokens admin et affiche les liens magiques — node scripts/generate-admin-links.mjs */
import { randomBytes } from "crypto";

const baseUrl = process.argv[2] ?? "http://localhost:3000";

const tokens = [
  {
    id: "fondateur",
    token: `amg_${randomBytes(24).toString("hex")}`,
    role: "administrateur",
    name: "Fondateur",
  },
  {
    id: "employe-cotonou",
    token: `amg_${randomBytes(24).toString("hex")}`,
    role: "employe",
    name: "Équipe Cotonou",
  },
];

console.log("\n=== ADMIN_ACCESS_TOKENS (.env.local) ===\n");
console.log(`ADMIN_ACCESS_TOKENS='${JSON.stringify(tokens)}'\n`);

console.log("=== Liens magiques ===\n");
for (const entry of tokens) {
  const url = new URL("/admin/entree", baseUrl);
  url.searchParams.set("token", entry.token);
  console.log(`${entry.name} (${entry.role})`);
  console.log(url.toString());
  console.log("");
}

console.log("Déconnexion : GET /api/admin/auth (DELETE) ou supprimer le cookie amg_admin_session\n");
