import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log("TABLES", tables.map((t) => t.tablename).join(", "));

  const zone = await prisma.deliveryZone.create({
    data: { id: "ping-zone", name: "Ping", cost: 100 },
  });
  await prisma.deliveryZone.delete({ where: { id: zone.id } });
  console.log("WRITE_OK");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
