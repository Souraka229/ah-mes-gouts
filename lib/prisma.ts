import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL manquant — configurez la connexion Postgres Supabase (pooler + direct).",
    );
  }

  if (!globalForPrisma.prisma) {
    // Production : DATABASE_URL doit inclure pgbouncer=true&connection_limit=1 (port 6543).
    globalForPrisma.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
    });
  }

  return globalForPrisma.prisma;
}
