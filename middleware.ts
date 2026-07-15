import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  getAdminContextFromRequest,
  isAdminAuthorizedFromRequest,
  isAdministratorFromRequest,
} from "@/lib/server/admin-auth-edge";

/** Admin : lien magique (?token=) ou dev local ADMIN_DEV_OPEN=true. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname === "/admin/entree") {
    return NextResponse.next();
  }

  if (!isAdminAuthorizedFromRequest(request)) {
    return NextResponse.redirect(new URL("/?admin=locked", request.url));
  }

  if (
    pathname.startsWith("/admin/assistant") &&
    !isAdministratorFromRequest(request)
  ) {
    return NextResponse.redirect(
      new URL("/admin?assistant=forbidden", request.url),
    );
  }

  const adminOnlyPrefixes = [
    "/admin/site-builder",
    "/admin/parametres/general",
    "/admin/parametres/journal",
    "/admin/parametres/notifications",
    "/admin/parametres/promotions",
    "/admin/parametres/utilisateurs",
  ];

  if (
    adminOnlyPrefixes.some((p) => pathname.startsWith(p)) &&
    !isAdministratorFromRequest(request)
  ) {
    return NextResponse.redirect(
      new URL("/admin?forbidden=admin", request.url),
    );
  }

  if (pathname === "/admin/parametres" && !isAdministratorFromRequest(request)) {
    return NextResponse.redirect(
      new URL("/admin/parametres/livraison", request.url),
    );
  }

  const context = getAdminContextFromRequest(request);
  if (context) {
    const response = NextResponse.next();
    response.headers.set("x-amg-admin-role", context.role);
    response.headers.set("x-amg-admin-name", context.name);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
