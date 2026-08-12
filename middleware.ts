import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  getAdminContextFromRequest,
  isAdministratorFromRequest,
} from "@/lib/server/admin-auth-edge";
import {
  ADMIN_SESSION_COOKIE,
  buildAdminSessionCookie,
} from "@/lib/server/admin-session";
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_OPTIONS,
} from "@/lib/server/device-cookie";

/**
 * Hôte dédié au back-office. Tant qu'il n'est pas branché, la valeur reste
 * vide et le middleware garde le comportement mono-domaine actuel.
 * Renseigner ADMIN_HOST déclenche la séparation : /admin disparaît du domaine
 * public (404) et l'hôte admin ne sert plus que le back-office.
 */
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST?.trim() ?? "";

/** Pages réservées au rôle administrateur (les employés n'y accèdent pas). */
const ADMIN_ONLY_PREFIXES = [
  "/admin/parametres/boutique",
  "/admin/parametres/journal",
  "/admin/parametres/notifications",
  "/admin/parametres/promotions",
  "/admin/parametres/utilisateurs",
];

/**
 * Pose l'identifiant d'appareil s'il manque — mémoire client sans inscription.
 * Côté boutique uniquement : le back-office n'a rien à mémoriser.
 */
function withDeviceCookie(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Pas de Set-Cookie sur les API ni sur les ressources indexables : un cookie
  // sur sitemap.xml ou robots.txt les rendrait non cachables par le CDN.
  const skip =
    pathname.startsWith("/api/") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest-admin.webmanifest";

  if (!skip && !request.cookies.get(DEVICE_COOKIE)) {
    response.cookies.set({
      name: DEVICE_COOKIE,
      value: crypto.randomUUID(),
      secure: process.env.NODE_ENV === "production",
      ...DEVICE_COOKIE_OPTIONS,
    });
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const adminHostConfigured = ADMIN_HOST.length > 0;
  const isAdminHost = adminHostConfigured && host === ADMIN_HOST;
  const isAdminPath = pathname.startsWith("/admin");

  if (adminHostConfigured) {
    // Le domaine public sert la boutique, pas le back-office : on renvoie
    // vers l'hôte admin plutôt qu'un 404. Le sous-domaine est de toute façon
    // visible dans le DNS, et un 404 ici enfermerait l'équipe dehors le jour
    // où quelqu'un arrive par un ancien favori.
    if (!isAdminHost && isAdminPath) {
      const target = new URL(request.nextUrl.pathname, `https://${ADMIN_HOST}`);
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target, 308);
    }
    // L'hôte admin ne sert que le back-office.
    if (isAdminHost && !isAdminPath && !pathname.startsWith("/api/admin")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  if (!isAdminPath) {
    return withDeviceCookie(request);
  }

  // Point d'échange du lien magique : doit rester joignable sans session.
  if (pathname === "/admin/entree") {
    return NextResponse.next();
  }

  const context = await getAdminContextFromRequest(request);
  if (!context) {
    return NextResponse.redirect(new URL("/?admin=locked", request.url));
  }

  if (
    ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !(await isAdministratorFromRequest(request))
  ) {
    return NextResponse.redirect(new URL("/admin?forbidden=admin", request.url));
  }

  if (pathname === "/admin/parametres" && context.role !== "administrateur") {
    return NextResponse.redirect(
      new URL("/admin/parametres/livraison", request.url),
    );
  }

  const response = NextResponse.next();
  response.headers.set("x-amg-admin-role", context.role);
  response.headers.set("x-amg-admin-name", context.name);

  // Repose le cookie à chaque passage : sa date d'expiration glisse avec
  // l'usage. Sans ça, le cookie finirait par expirer côté navigateur même
  // avec une session toujours vivante en base, et le back-office demanderait
  // une reconnexion sans raison.
  const current = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (current) {
    response.cookies.set(buildAdminSessionCookie(current));
  }

  return response;
}

export const config = {
  // Couvre tout le site : c'est le middleware qui masque /admin sur le
  // domaine public une fois NEXT_PUBLIC_ADMIN_HOST renseigné.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|icons/).*)"],
};
