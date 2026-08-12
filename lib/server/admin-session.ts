import { SignJWT, jwtVerify } from "jose";

import type { AdminRole } from "@/lib/admin/types";
import { getPrisma } from "@/lib/prisma";

/**
 * Session admin signée et révocable.
 *
 * Remplace le token statique en cookie, qui était le secret permanent
 * lui-même : pas de signature, pas d'expiration serveur, pas de révocation
 * sans redéploiement, et il transitait en clair dans l'URL des liens magiques.
 *
 * Le token de `ADMIN_ACCESS_TOKENS` ne sert plus qu'à l'échange initial :
 * il est consommé une fois par /admin/entree, qui émet cette session.
 */

const ALG = "HS256";
const ISSUER = "gift-entremets";
const AUDIENCE = "admin";

export const ADMIN_SESSION_COOKIE = "ge_admin";
export const ADMIN_SESSION_TTL_HOURS = 12;

export type AdminClaims = {
  /** Identifiant de session en base — permet la révocation. */
  sid: string;
  role: AdminRole;
  name: string;
};

function secret(): Uint8Array {
  const raw = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!raw || raw.length < 32) {
    // Échec bruyant plutôt qu'une session non signée en silence.
    throw new Error(
      "ADMIN_SESSION_SECRET manquant ou trop court (32 caractères minimum).",
    );
  }
  return new TextEncoder().encode(raw);
}

/** Le secret est-il configuré ? Permet un repli propre pendant la bascule. */
export function isAdminSessionConfigured(): boolean {
  const raw = process.env.ADMIN_SESSION_SECRET?.trim();
  return Boolean(raw && raw.length >= 32);
}

export async function issueAdminSession(input: {
  role: AdminRole;
  name: string;
  userAgent?: string | null;
  ipHash?: string | null;
}): Promise<{ jwt: string; expiresAt: Date }> {
  const expiresAt = new Date(
    Date.now() + ADMIN_SESSION_TTL_HOURS * 3_600_000,
  );

  const session = await getPrisma().adminSession.create({
    data: {
      role: input.role,
      name: input.name,
      expiresAt,
      userAgent: input.userAgent ?? null,
      ipHash: input.ipHash ?? null,
    },
    select: { id: true },
  });

  const jwt = await new SignJWT({
    sid: session.id,
    role: input.role,
    name: input.name,
  })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${ADMIN_SESSION_TTL_HOURS}h`)
    .sign(secret());

  return { jwt, expiresAt };
}

/**
 * Vérifie la signature seule — utilisable dans le middleware Edge, qui ne
 * peut pas interroger Postgres. Une session révoquée passe encore ici, au
 * plus le temps restant du JWT : elle est bloquée par verifyAdminSession()
 * sur toute action réelle.
 */
export async function verifyAdminJwt(
  token: string | undefined,
): Promise<AdminClaims | null> {
  if (!token?.trim()) return null;

  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALG],
    });

    const role = payload.role;
    if (role !== "administrateur" && role !== "employe") return null;
    if (typeof payload.sid !== "string" || typeof payload.name !== "string") {
      return null;
    }

    return { sid: payload.sid, role, name: payload.name };
  } catch {
    return null;
  }
}

/** Vérification complète, révocation incluse. Runtime Node uniquement. */
export async function verifyAdminSession(
  token: string | undefined,
): Promise<AdminClaims | null> {
  const claims = await verifyAdminJwt(token);
  if (!claims) return null;

  const session = await getPrisma().adminSession.findUnique({
    where: { id: claims.sid },
    select: { revokedAt: true, expiresAt: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  // Trace de présence — non bloquante, une session valide ne doit jamais
  // échouer parce que l'écriture de télémétrie a échoué.
  void getPrisma()
    .adminSession.update({
      where: { id: claims.sid },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => null);

  return claims;
}

export async function revokeAdminSession(sid: string): Promise<void> {
  await getPrisma()
    .adminSession.update({
      where: { id: sid },
      data: { revokedAt: new Date() },
    })
    .catch(() => null);
}

/** Purge des sessions expirées — appelée par le cron quotidien. */
export async function purgeExpiredAdminSessions(): Promise<number> {
  const result = await getPrisma().adminSession.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 7 * 86_400_000) } },
  });
  return result.count;
}
