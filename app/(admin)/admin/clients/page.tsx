import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { AdminCustomersPage } from "@/components/admin/admin-customers-page";

export default function ClientsAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center gap-2 font-body text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Chargement…
        </div>
      }
    >
      <AdminCustomersPage />
    </Suspense>
  );
}
