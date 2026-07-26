import type { Metadata } from "next";
import { Toaster } from "sonner";

import { DriverPortal } from "@/components/livreur/driver-portal";
import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ accessToken: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { accessToken } = await params;
  return {
    title: "Livreur",
    applicationName: "Livreur",
    manifest: `/api/pwa/driver-manifest?token=${encodeURIComponent(accessToken)}`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Livreur",
    },
    icons: {
      icon: "/pwa/driver-icon.svg",
      apple: "/pwa/driver-icon.svg",
    },
    robots: { index: false, follow: false },
  };
}

export default async function LivreurPage({ params }: PageProps) {
  const { accessToken } = await params;

  return (
    <div className="min-h-screen bg-bg font-body text-text">
      <PwaRegistrar serviceWorker="/driver-sw.js" scope="/livreur/" />
      <div className="border-b border-border bg-primary px-4 py-4 text-center">
        <p className="font-display text-sm font-semibold tracking-wide text-primary-foreground">
          Ah Mes Goûts — Livraisons
        </p>
      </div>
      <DriverPortal accessToken={accessToken} />
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
