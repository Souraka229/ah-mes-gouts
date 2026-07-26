import { deliveryZones } from "@/lib/delivery-zones";
import { getOgImageUrl, getProductImageUrl } from "@/lib/seo/images";
import { DEFAULT_OG_IMAGE, BUSINESS, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import {
  getProductPrice,
  isProductAvailable,
} from "@/lib/catalog-utils";
import type { Product } from "@/types/product";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function buildIceCreamShopSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "IceCreamShop",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    description:
      "Glacier premium à Cotonou. Commandez vos glaces artisanales en ligne avec livraison rapide dans tout Cotonou et environs.",
    url: SITE_URL,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    image: getOgImageUrl(DEFAULT_OG_IMAGE),
    priceRange: BUSINESS.priceRange,
    servesCuisine: BUSINESS.servesCuisine,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      addressCountry: BUSINESS.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "10:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "11:00",
        closes: "22:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "12:00",
        closes: "18:00",
      },
    ],
    areaServed: deliveryZones.flatMap((zone) =>
      zone.areas.map((area) => ({
        "@type": "City",
        name: `${area}, Cotonou, Bénin`,
      })),
    ),
    paymentAccepted: BUSINESS.paymentAccepted.join(", "),
    hasMenu: {
      "@type": "Menu",
      url: `${SITE_URL}/catalogue`,
    },
    potentialAction: {
      "@type": "OrderAction",
      target: `${SITE_URL}/catalogue`,
      deliveryMethod: [
        "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
        "http://purl.org/goodrelations/v1#DeliveryModePickUp",
      ],
    },
  };
}

export function buildProductSchema(product: Product) {
  const price = getProductPrice(product);
  const available = isProductAvailable(product);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: [getProductImageUrl(product.imageUrl, 1200)],
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/produit/${product.slug}`,
      priceCurrency: "XOF",
      price: price,
      availability: available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
  };
}

export type FaqItem = {
  question: string;
  answer: string;
};

export function buildFaqSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
