import {
  BOUTIQUE_HOURS,
  BOUTIQUE_LOCATION,
  ORDER_PHONE,
} from "@/lib/business-info";
import { getYearsOfCraft } from "@/lib/about-content";
import { ORIGIN_BRAND, SITE_NAME, SITE_URL } from "@/lib/seo/site";

export type BrandFaq = {
  question: string;
  answer: string;
};

export function buildBrandFaqs(now = new Date()): BrandFaq[] {
  const years = getYearsOfCraft(now);

  return [
    {
      question: `Qu'est-ce qu'${ORIGIN_BRAND} ?`,
      answer: `${ORIGIN_BRAND} est une maison pâtissière artisanale fondée à Cotonou en 2016. Depuis ${years} ans, la maison développe des recettes d'entremets glacés, des textures travaillées au jour le jour et une exigence de finition qui ne se délègue pas à l'industriel.`,
    },
    {
      question: `Quel est le lien entre ${ORIGIN_BRAND} et ${SITE_NAME} ?`,
      answer: `${SITE_NAME} est la boutique en ligne officielle de ${ORIGIN_BRAND}. C'est la vitrine digitale où l'on commande les créations du jour, les entremets sur commande, les bouquets de roses et les nounours — avec livraison à Cotonou ou retrait en boutique à Fidjrossè.`,
    },
    {
      question: `Où commander les créations ${ORIGIN_BRAND} ?`,
      answer: `La commande se fait sur ${SITE_URL} (${SITE_NAME}). Paiement en ligne par Mobile Money ou carte, en FCFA. Retrait ou livraison sur créneau, du mardi au dimanche de ${BOUTIQUE_HOURS.label}.`,
    },
    {
      question: `${ORIGIN_BRAND} livre-t-il à Cotonou ?`,
      answer: `Oui, via ${SITE_NAME}. Trois tournées quotidiennes couvrent Cotonou et ses environs. Les tarifs par zone sont détaillés sur ${SITE_URL}/zones-de-livraison.`,
    },
    {
      question: `Comment contacter ${ORIGIN_BRAND} ?`,
      answer: `Atelier : ${BOUTIQUE_LOCATION.full}. Téléphone et WhatsApp : ${ORDER_PHONE.display}. Instagram : @ahmesgouts.`,
    },
  ];
}
