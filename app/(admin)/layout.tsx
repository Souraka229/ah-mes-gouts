import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminProviders } from "@/components/admin/admin-providers";
import { AdminErrorBoundary } from "@/components/admin/admin-error-boundary";

export const metadata: Metadata = {
  title: "Back-office",
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
      <AdminShell>
        <AdminErrorBoundary>{children}</AdminErrorBoundary>
      </AdminShell>
    </AdminProviders>
  );
}
