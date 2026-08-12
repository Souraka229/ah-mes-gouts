import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProviders } from "@/components/admin/admin-providers";
import { AdminErrorBoundary } from "@/components/admin/admin-error-boundary";
import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";
import { getAdminContextAsync } from "@/lib/server/admin-auth";

export const metadata: Metadata = {
  title: "Admin",
  applicationName: "Admin",
  manifest: "/manifest-admin.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Admin",
  },
  icons: {
    icon: "/pwa/admin-icon.svg",
    apple: "/pwa/admin-icon.svg",
  },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Résolu côté serveur (cookie de session déjà là) — évite le fetch client
  // et le flash de sidebar incomplète le temps qu'il réponde.
  const context = await getAdminContextAsync();
  const me = context
    ? {
        adminName: context.name,
        role: context.role,
        isAdministrator: context.role === "administrateur",
      }
    : null;

  return (
    <AdminProviders>
      <PwaRegistrar serviceWorker="/admin-sw.js" scope="/admin/" />
      <AdminShell me={me}>
        <AdminErrorBoundary>{children}</AdminErrorBoundary>
      </AdminShell>
    </AdminProviders>
  );
}
