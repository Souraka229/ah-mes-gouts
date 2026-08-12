import Link from "next/link";
import { WifiOff } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

export const metadata = createPageMetadata({
  title: "Hors connexion",
  description: "Cette page nécessite une connexion internet.",
  path: "/offline",
  noIndex: true,
});

/** Servie par le service worker quand le réseau est coupé. */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="size-7" aria-hidden />
      </span>

      <h1 className="font-display text-2xl font-semibold text-primary sm:text-3xl">
        Pas de connexion
      </h1>

      <p className="mt-3 font-body text-sm text-muted-foreground">
        Le menu du jour et les créneaux changent en permanence — nous préférons
        ne rien vous montrer plutôt que des informations dépassées. Reconnectez-vous
        et réessayez.
      </p>

      <Link
        href="/"
        className={cn(buttonVariants({ size: "lg" }), "mt-8 cursor-pointer")}
      >
        Réessayer
      </Link>
    </div>
  );
}
