"use client";

import { Toaster } from "sonner";

import { AdminCommandPalette } from "@/components/admin/admin-command-palette";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdminCommandPalette />
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}
