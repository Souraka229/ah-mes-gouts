"use client";

import { Toaster } from "sonner";

import { AdminSessionHeartbeat } from "@/components/admin/admin-session-heartbeat";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminSessionHeartbeat />
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}
