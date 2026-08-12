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

/**
 * Durée de vie d'une session : 400 jours, le plafond accepté par les
 * navigateurs pour un cookie.
 *
 * La session se prolonge d'elle-même à chaque utilisation (voir
 * `verifyAdminSession`) : tant que la boutique ouvre son back-office au moins
 * une fois tous les 400 jours, personne ne se reconnecte jamais.
 *
 * Ce qui reste possible, et qui doit le rester : révoquer une session depuis
 * la base. Sans ça, un téléphone perdu donnerait un accès admin définitif,
 * sans aucun moyen de le couper autrement qu'en changeant le secret et en
 * déconnectant toute l'équipe d'un coup.
 */
export const ADMIN_SESSION_TTL_DAYS = 400;
const TTL_MS = ADMIN_SESSION_TTL_DAYS * 24 * 3_600_000;

/** Prolongation anticipée : on rafraîchit dès qu'il reste moins de 300 jours. */
const RENEW_WHEN_REMAINING_MS = 300 * 24 * 3_600_000;

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

async function signSession(claims: AdminClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${ADMIN_SESSION_TTL_DAYS}d`)
    .sign(secret());
}

export async function issueAdminSession(input: {
  role: AdminRole;
  name: string;
  userAgent?: string | null;
  ipHash?: string | null;
}): Promise<{ jwt: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + TTL_MS);

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

  const jwt = await signSession({
    sid: session.id,
    role: input.role,
    name: input.name,
  });

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

/**
 * Vérification complète, révocation incluse. Runtime Node uniquement.
 *
 * Prolonge la session au passage : tant que le back-office est utilisé, la
 * date d'expiration recule. C'est ce qui fait qu'on ne se déconnecte jamais,
 * sans renoncer à pouvoir couper un accès.
 */
export async function verifyAdminSession(
  token: string | undefined,
): Promise<AdminClaims | null> {
  const claims = await verifyAdminJwt(token);
  if (!claims) return null;

  const prisma = getPrisma();
  const session = await prisma.adminSession.findUnique({
    where: { id: claims.sid },
    select: { revokedAt: true, expiresAt: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  const remaining = session.expiresAt.getTime() - Date.now();
  const data: { lastSeenAt: Date; expiresAt?: Date } = { lastSeenAt: new Date() };
  if (remaining < RENEW_WHEN_REMAINING_MS) {
    data.expiresAt = new Date(Date.now() + TTL_MS);
  }

  // Non bloquant : une session valide ne doit jamais échouer parce que
  // l'écriture de présence a échoué.
  void prisma.adminSession
    .update({ where: { id: claims.sid }, data })
    .catch(() => null);

  return claims;
}

/**
 * Cookie de session à reposer sur la réponse.
 *
 * Le cookie est renvoyé à chaque passage pour que sa date d'expiration
 * glisse avec la session : un cookie posé une seule fois finirait par expirer
 * côté navigateur même avec une session vivante en base.
 */
export function buildAdminSessionCookie(jwt: string) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: jwt,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  };
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
