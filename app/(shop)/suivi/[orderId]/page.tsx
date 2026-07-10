import type { Metadata } from "next";

import { OrderTrackingView } from "@/components/shop/checkout/order-tracking-view";
import { createPageMetadata } from "@/lib/seo/metadata";
import { SITE_NAME_WITH_CREDIT } from "@/lib/seo/site";

type TrackingPageProps = {
  params: Promise<{ orderId: string }>;
};

export async function generateMetadata({
  params,
}: TrackingPageProps): Promise<Metadata> {
  const { orderId } = await params;

  return createPageMetadata({
    title: `Suivi commande ${orderId}`,
    description: `Suivez l'état de votre commande ${SITE_NAME_WITH_CREDIT} en temps réel.`,
    path: `/suivi/${orderId}`,
    noIndex: true,
  });
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { orderId } = await params;
  return <OrderTrackingView orderId={orderId} />;
}
