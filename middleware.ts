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

/**
 * Chemins servis tels quels, sur n'importe quel hôte et sans session.
 *
 * Les assets qui rendent une application installable ne vivent pas sous
 * `/admin` : sans cette exemption, l'hôte admin renvoie le manifeste et les
 * icônes vers `/admin`, et l'application n'est plus installable là où on
 * l'installe justement. `admin-sw.js` comptait aussi : il commence par
 * `/admin` sans être une page du back-office.
 */
const PWA_ASSET_PATHS = [
  "/manifest.webmanifest",
  "/manifest-admin.webmanifest",
  "/shop-sw.js",
  "/admin-sw.js",
  "/driver-sw.js",
  "/icon.png",
  "/apple-icon.png",
];

function isPwaAsset(pathname: string): boolean {
  return pathname.startsWith("/pwa/") || PWA_ASSET_PATHS.includes(pathname);
}

function isDriverPath(pathname: string): boolean {
  return (
    pathname === "/livreur" ||
    pathname.startsWith("/livreur/") ||
    pathname.startsWith("/api/livreur") ||
    pathname.startsWith("/api/pwa/driver-manifest")
  );
}

/** Domaine boutique — jamais le sous-domaine admin. */
function publicSiteOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const publicHost = host.startsWith("admin.") ? host.slice("admin.".length) : host;
  return `https://${publicHost}`;
}

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
  // `/admin` et `/admin/...`, pas `/admin-sw.js` : `startsWith("/admin")`
  // attrapait le service worker, qui n'est pas une page du back-office.
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  // Avant toute redirection par hôte : sinon l'hôte admin renvoie le
  // manifeste et les icônes vers `/admin` et la PWA n'est plus installable.
  if (isPwaAsset(pathname)) {
    return NextResponse.next();
  }

  if (adminHostConfigured) {
    // Le portail livreur vit sur le domaine public, pas sur l'hôte admin :
    // sinon le lien /livreur/… atterrit sur la page de connexion back-office.
    if (isAdminHost && isDriverPath(pathname)) {
      const target = new URL(pathname, publicSiteOrigin(request));
      target.search = request.nextUrl.search;
      return NextResponse.redirect(target, 308);
    }

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

  // Point d'échange du lien magique, atterrissage sans session, et shell
  // hors-ligne PWA : joignables sans cookie (sinon le precache SW échoue).
  if (
    pathname === "/admin/entree" ||
    pathname === "/admin/connexion" ||
    pathname === "/admin/offline"
  ) {
    return NextResponse.next();
  }

  const context = await getAdminContextFromRequest(request);
  if (!context) {
    // `/?admin=locked` est une page de la boutique. Sur l'hôte admin, le
    // middleware la renvoyait vers `/admin`, qui renvoyait ici : boucle
    // infinie, et un admin déconnecté n'avait plus aucune porte d'entrée.
    return NextResponse.redirect(
      new URL("/admin/connexion?raison=session", request.url),
    );
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
