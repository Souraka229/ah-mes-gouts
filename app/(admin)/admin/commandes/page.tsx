import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { AdminOrdersPage } from "@/components/admin/admin-orders-page";

export default function CommandesAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center gap-2 font-body text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Chargement…
        </div>
      }
    >
      <AdminOrdersPage />
    </Suspense>
  );
}
