import type { Metadata } from "next";
import { Toaster } from "sonner";

import { DriverPortal } from "@/components/livreur/driver-portal";

export const metadata: Metadata = {
  title: "Portail livreur",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ accessToken: string }>;
};

export default async function LivreurPage({ params }: PageProps) {
  const { accessToken } = await params;

  return (
    <div className="min-h-screen bg-bg font-body text-text">
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
