#!/usr/bin/env node
/**
 * GRILLE DE LIVRAISON — zones + lieux, en base.
 *
 * Amorce `DeliveryZone` et `DeliveryArea` depuis la grille officielle
 * (`lib/delivery-zones.ts`). Une fois semée, **c'est la base qui fait foi** :
 * le serveur y lit le tarif d'un lieu (`resolveDeliveryAreaPrice`), et l'admin
 * peut corriger un prix sans redéploiement.
 *
 * GARANTIES :
 *   - aucun `delete`, aucun `deleteMany` : un lieu retiré de la grille est
 *     **désactivé**, jamais effacé — une commande passée garde son tarif ;
 *   - upsert par (zoneId, name) : un lieu déjà présent est mis à jour, jamais
 *     dupliqué ;
 *   - aucune commande, aucun panier touché ;
 *   - AVANT / APRÈS affiché ;
 *   - `--dry-run` n'écrit rien.
 *
 * Usage :
 *   node scripts/sync-delivery-areas.mjs --dry-run
 *   node scripts/sync-delivery-areas.mjs
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

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

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

// Node lit directement le TypeScript de la grille : une seule source de vérité,
// aucune copie des tarifs dans ce script.
const { deliveryZones } = await import(
  new URL("../lib/delivery-zones.ts", import.meta.url).href
);

const prisma = new PrismaClient();

/** Tarif de repli d'une zone qui n'en a pas un seul (« Hors Cotonou »). */
function zoneCost(zone) {
  const prices = [...new Set(zone.areas.map((a) => a.price))].sort((a, b) => a - b);
  return prices[0] ?? 0;
}

function formatFcfa(value) {
  return `${value.toLocaleString("fr-FR")} F`;
}

async function main() {
  console.log(
    DRY_RUN
      ? "=== GRILLE DE LIVRAISON — SIMULATION (aucune écriture) ==="
      : "=== GRILLE DE LIVRAISON — ÉCRITURE ===",
  );

  const beforeZones = await prisma.deliveryZone.findMany();
  const beforeAreas = await prisma.deliveryArea.findMany();
  console.log(
    `AVANT : ${beforeZones.length} zone(s), ${beforeAreas.length} lieu(x)`,
  );

  const wantedKeys = new Set();
  let zonesUpserted = 0;
  let areasCreated = 0;
  let areasUpdated = 0;
  let areasDeactivated = 0;

  const existingAreaByKey = new Map(
    beforeAreas.map((a) => [`${a.zoneId}::${a.name}`, a]),
  );

  for (const zone of deliveryZones) {
    const cost = zoneCost(zone);
    const existingZone = beforeZones.find((z) => z.id === zone.id);

    console.log(
      `\n── ${zone.name} (${zone.id}) — ${zone.areas.length} lieu(x) — repli ${formatFcfa(cost)}`,
    );
    if (existingZone) {
      console.log(
        `   AVANT : « ${existingZone.name} » ${formatFcfa(existingZone.cost)}`,
      );
    }

    if (!DRY_RUN) {
      await prisma.deliveryZone.upsert({
        where: { id: zone.id },
        update: { name: zone.name, cost },
        create: { id: zone.id, name: zone.name, cost },
      });
    }
    zonesUpserted += 1;

    for (const [index, area] of zone.areas.entries()) {
      const key = `${zone.id}::${area.name}`;
      wantedKeys.add(key);
      const existing = existingAreaByKey.get(key);

      if (existing) {
        const changed =
          existing.price !== area.price ||
          existing.sortOrder !== index ||
          !existing.isActive;
        if (changed) areasUpdated += 1;
      } else {
        areasCreated += 1;
      }

      if (DRY_RUN) continue;

      await prisma.deliveryArea.upsert({
        where: { zoneId_name: { zoneId: zone.id, name: area.name } },
        update: { price: area.price, sortOrder: index, isActive: true },
        create: {
          zoneId: zone.id,
          name: area.name,
          price: area.price,
          sortOrder: index,
          isActive: true,
        },
      });
    }

    if (!DRY_RUN) {
      // Un lieu retiré de la grille est désactivé, jamais supprimé.
      const removed = beforeAreas.filter(
        (a) => a.zoneId === zone.id && !wantedKeys.has(`${a.zoneId}::${a.name}`),
      );
      if (removed.length > 0) {
        await prisma.deliveryArea.updateMany({
          where: { id: { in: removed.map((a) => a.id) } },
          data: { isActive: false },
        });
        areasDeactivated += removed.length;
        console.log(
          `   lieux retirés (désactivés) : ${removed.map((a) => a.name).join(", ")}`,
        );
      }
    }
  }

  const afterZones = DRY_RUN ? beforeZones.length : await prisma.deliveryZone.count();
  const afterAreas = DRY_RUN ? beforeAreas.length : await prisma.deliveryArea.count();

  console.log("\n=== RÉCAPITULATIF ===");
  console.log(`Zones : ${beforeZones.length} → ${afterZones} (${zonesUpserted} traitées)`);
  console.log(
    `Lieux : ${beforeAreas.length} → ${afterAreas} | créés ${areasCreated}, mis à jour ${areasUpdated}, désactivés ${areasDeactivated}`,
  );

  if (!DRY_RUN) {
    const prices = await prisma.deliveryArea.findMany({
      where: { isActive: true },
      select: { price: true },
    });
    const tiers = [...new Set(prices.map((p) => p.price))].sort((a, b) => a - b);
    console.log(`Paliers en base : ${tiers.map(formatFcfa).join(", ")}`);
  } else {
    console.log("Simulation : rien n'a été écrit.");
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("❌ Échec :", error);
  await prisma.$disconnect();
  process.exit(1);
});
