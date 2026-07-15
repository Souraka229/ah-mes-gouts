import Link from "next/link";
import { MapPin, Phone, Share2 } from "lucide-react";

import { BrandLogo } from "@/components/shop/brand-logo";
import { Separator } from "@/components/ui/separator";
import {
  BOUTIQUE_LOCATION,
  ORDER_PHONE,
  WHATSAPP_PICKUP,
} from "@/lib/business-info";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/social-links";

const legalLinks = [
  { href: "/infos", label: "Infos" },
  { href: "#", label: "Mentions légales" },
  { href: "#", label: "CGV" },
  { href: "#", label: "Confidentialité" },
] as const;

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <BrandLogo />
            <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
              Entremets & fleurs — créations artisanales à Cotonou.
            </p>
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold text-primary">
              Boutique
            </h3>
            <p className="mt-3 font-body text-sm text-muted-foreground">
              En boutique · Sur place — {BOUTIQUE_LOCATION.short}
            </p>
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold text-primary">
              Horaires
            </h3>
            <ul className="mt-3 space-y-2 font-body text-sm text-muted-foreground">
              <li>Tous les jours : 13h – 19h</li>
              <li>En boutique · Sur place</li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold text-primary">
              Contact
            </h3>
            <ul className="mt-3 space-y-3 font-body text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-accent" aria-hidden />
                <a
                  href={`tel:${ORDER_PHONE.tel}`}
                  className="cursor-pointer transition-colors hover:text-primary"
                >
                  {ORDER_PHONE.display}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-accent" aria-hidden />
                <a
                  href={WHATSAPP_PICKUP.waMe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer transition-colors hover:text-primary"
                >
                  WhatsApp : {WHATSAPP_PICKUP.display}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>{BOUTIQUE_LOCATION.full}</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-lg font-semibold text-primary">
              Réseaux
            </h3>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex cursor-pointer items-center gap-2 font-body text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Share2 className="size-4" aria-hidden />
              {INSTAGRAM_HANDLE}
            </a>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-body text-xs text-muted-foreground">
            © {new Date().getFullYear()} {SITE_NAME_WITH_CREDIT}. Tous droits
            réservés.
          </p>
          <nav
            className="flex flex-wrap justify-center gap-4"
            aria-label="Liens légaux"
          >
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="cursor-pointer font-body text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
