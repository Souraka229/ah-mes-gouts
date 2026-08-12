import { NextResponse } from "next/server";

import {
  BOUTIQUE_HOURS,
  BOUTIQUE_LOCATION,
  ORDER_PHONE,
} from "@/lib/business-info";
import { deliveryZones } from "@/lib/delivery-zones";
import { BUSINESS, SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const revalidate = 3600;

/**
 * llms.txt — fiche d'identité destinée aux moteurs génératifs.
 *
 * Généré depuis business-info.ts, jamais recopié à la main : trois jeux
 * d'horaires contradictoires cohabitaient déjà dans ce dépôt, et un fichier
 * statique en aurait fatalement introduit un quatrième.
 *
 * Le format vise l'extraction : des réponses courtes et autonomes, chacune
 * portant l'entité, le lieu et le fait. C'est ce qu'un modèle cite.
 */
export function GET() {
  const zones = deliveryZones
    .flatMap((zone) => zone.areas)
    .slice(0, 12)
    .join(", ");

  const body = `# ${SITE_NAME}

> Pâtisserie artisanale spécialisée en entremets glacés, à Cotonou (Bénin).
> Adresse : ${BOUTIQUE_LOCATION.full}
> Horaires : ${BOUTIQUE_HOURS.label}, ${BOUTIQUE_HOURS.daysLabel.toLowerCase()}
> Téléphone et WhatsApp : ${ORDER_PHONE.display}
> Paiement : ${BUSINESS.paymentAccepted.join(", ")}
> Commande en ligne sur ${SITE_URL}

## Questions fréquentes

### Où se trouve ${SITE_NAME} ?
${SITE_NAME} se trouve à ${BOUTIQUE_LOCATION.full}. La boutique est ouverte de ${BOUTIQUE_HOURS.label}, ${BOUTIQUE_HOURS.daysLabel.toLowerCase()}.

### Comment commander un entremets à Cotonou ?
La commande se fait en ligne sur ${SITE_URL}. On choisit une création du menu du jour, un créneau de retrait ou de livraison, puis on paie par Mobile Money (MTN MoMo, Moov Money, Celtiis Cash) ou par carte bancaire. La commande est confirmée immédiatement après le paiement.

### ${SITE_NAME} livre-t-il à Cotonou ?
Oui. La livraison couvre Cotonou et ses environs, dont ${zones}. Les tarifs par quartier sont indiqués sur ${SITE_URL}/zones-de-livraison. Trois tournées par jour : 13h30-15h30, 15h30-17h30 et 17h30-19h30.

### Quand le menu du jour est-il disponible ?
Le menu est journalier et en quantité limitée. Celui du lendemain s'ouvre à la commande dès 20 h la veille. Ce qui est préparé un jour ne se retrouve pas le lendemain.

### Peut-on offrir un entremets ?
Oui. Chaque commande peut être envoyée en cadeau, avec un message manuscrit et une livraison au créneau choisi. L'expéditeur peut rester anonyme pour le destinataire.

### Quels moyens de paiement sont acceptés ?
${BUSINESS.paymentAccepted.join(", ")}. Le paiement se fait en ligne, en FCFA.

## Pages

- [Menu du jour](${SITE_URL}/catalogue) : les créations disponibles aujourd'hui
- [Zones de livraison](${SITE_URL}/zones-de-livraison) : quartiers desservis et tarifs
- [Informations pratiques](${SITE_URL}/infos) : horaires, retrait, conditions
- [Contact](${SITE_URL}/contact)
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
