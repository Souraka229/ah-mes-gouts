/**
 * Audit lecture seule — commandes, CRM, tables WhatsApp si migrées.
 * node scripts/whatsapp-db-audit.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function safe(label, fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, label, error: e.message?.slice(0, 200) ?? String(e) };
  }
}

async function main() {
  const since7 = new Date(Date.now() - 7 * 86400_000);

  const customers = await safe("Customer", () => prisma.customer.count());
  const orders7 = await safe("Order", () =>
    prisma.order.count({ where: { createdAt: { gte: since7 } } }),
  );
  const wa7 = await safe("Order whatsapp", () =>
    prisma.order.count({
      where: { salesChannel: "whatsapp", createdAt: { gte: since7 } },
    }),
  );
  const waPaid = await safe("Order whatsapp paid", () =>
    prisma.order.count({
      where: {
        salesChannel: "whatsapp",
        status: { not: "RECUE" },
        createdAt: { gte: since7 },
      },
    }),
  );
  const waPending = await safe("Order whatsapp RECUE", () =>
    prisma.order.count({
      where: { salesChannel: "whatsapp", status: "RECUE" },
    }),
  );

  const modes = await safe("Order modes 7d", () =>
    prisma.order.groupBy({
      by: ["mode"],
      where: { createdAt: { gte: since7 } },
      _count: { mode: true },
    }),
  );

  const botLogs = await safe("WhatsAppBotLog", () =>
    prisma.whatsAppBotLog.count({
      where: { createdAt: { gte: since7 }, direction: "outbound" },
    }),
  );

  const llm = await safe("WhatsAppBotLog llm", () =>
    prisma.whatsAppBotLog.count({
      where: { createdAt: { gte: since7 }, usedLlm: true },
    }),
  );

  const intents = await safe("WhatsAppBotLog intents", () =>
    prisma.whatsAppBotLog.groupBy({
      by: ["intent"],
      where: { createdAt: { gte: since7 } },
      _count: { intent: true },
      orderBy: { _count: { intent: "desc" } },
      take: 10,
    }),
  );

  const recentWa = await safe("recent whatsapp orders", () =>
    prisma.order.findMany({
      where: { salesChannel: "whatsapp" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        mode: true,
        total: true,
        zoneName: true,
        createdAt: true,
      },
    }),
  );

  const topCustomers = await safe("top customers", () =>
    prisma.customer.findMany({
      orderBy: { ordersCount: "desc" },
      take: 5,
      select: {
        firstName: true,
        ordersCount: true,
        totalSpent: true,
        lastOrderAt: true,
      },
    }),
  );

  const migrationsHint = [];
  if (!botLogs.ok) {
    migrationsHint.push(
      "Tables WhatsApp absentes — appliquer supabase/migrations/20261007140000_whatsapp_bot_logs.sql et suivantes.",
    );
  }

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        migrationsHint,
        customers,
        orders7d: orders7,
        whatsapp7d: wa7,
        whatsappPaid7d: waPaid,
        whatsappPendingRecue: waPending,
        orderModes7d: modes,
        bot: { replies7d: botLogs, llm7d: llm, topIntents: intents },
        recentWhatsappOrders: recentWa,
        topCustomers,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
