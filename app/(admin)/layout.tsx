import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProviders } from "@/components/admin/admin-providers";
import { AdminErrorBoundary } from "@/components/admin/admin-error-boundary";
import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";

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

export default function AdminPlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminProviders>
      <PwaRegistrar serviceWorker="/admin-sw.js" scope="/admin/" />
      <AdminShell>
        <AdminErrorBoundary>{children}</AdminErrorBoundary>
      </AdminShell>
    </AdminProviders>
  );
}
