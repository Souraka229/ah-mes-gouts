import Link from "next/link";
import { WifiOff } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Hors connexion — Admin",
  robots: { index: false, follow: false },
};

/** Servie par le service worker admin quand le réseau est coupé. */
export default function AdminOfflinePage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="size-7" aria-hidden />
      </span>

      <h1 className="font-display text-2xl font-semibold text-primary sm:text-3xl">
        Pas de connexion
      </h1>

      <p className="mt-3 font-body text-sm text-muted-foreground">
        Les commandes et le stock doivent rester à jour — le back-office
        attend le réseau. Vos actions reprendront dès que la connexion
        revient.
      </p>

      <Link
        href="/admin"
        className={cn(buttonVariants({ size: "lg" }), "mt-8 cursor-pointer")}
      >
        Réessayer
      </Link>
    </div>
  );
}
