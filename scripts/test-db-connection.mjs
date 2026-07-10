import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const row = await prisma.deliveryZone.create({
    data: { id: "test-zone", name: "Test Connexion", cost: 1000 },
  });
  console.log("WRITE_OK", row.id);
  await prisma.deliveryZone.delete({ where: { id: "test-zone" } });
  console.log("DELETE_OK");
  const count = await prisma.deliveryZone.count();
  console.log("ZONES_COUNT", count);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
