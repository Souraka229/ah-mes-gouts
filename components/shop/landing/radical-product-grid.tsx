"use client";

import { menuPacks } from "@/lib/landing-data";
import type { MenuShowcaseItem } from "@/lib/server/shop-catalog";
import type { ProductGridSectionContent } from "@/types/site-content";
import { cn } from "@/lib/utils";

import { LandingGridCard } from "@/components/shop/landing/landing-grid-card";
import { MenuPackCard } from "@/components/shop/landing/menu-pack-card";
import { ProductClusterPanel } from "@/components/shop/landing/product-cluster-panel";
import { SectionMesh } from "@/components/shop/landing/section-mesh";

type ClusterSlot = {
  productIndex: number;
  heightPx: number;
  offsetClass?: string;
};

type ProductCluster = {
  id: string;
  slots: ClusterSlot[];
  mobileOrder: number;
};

const PRODUCT_CLUSTERS: ProductCluster[] = [
  {
    id: "cluster-solaire-floral",
    mobileOrder: 2,
    slots: [
      { productIndex: 0, heightPx: 480 },
      { productIndex: 1, heightPx: 380, offsetClass: "md:mt-12" },
    ],
  },
  {
    id: "cluster-signature-gourmand",
    mobileOrder: 1,
    slots: [
      { productIndex: 3, heightPx: 480 },
      { productIndex: 2, heightPx: 380, offsetClass: "md:mt-10" },
    ],
  },
];

export function RadicalProductGridSection({
  content,
  showcase,
}: {
  content: ProductGridSectionContent;
  showcase: MenuShowcaseItem[];
}) {
  return (
    <SectionMesh
      variant="product-grid"
      id="carte"
      className="mx-auto w-full max-w-[1400px] px-5 py-[8vh] sm:px-8 lg:px-10"
      aria-label="Menu du jour"
    >
      <div className="mb-8 lg:mb-10">
        <p className="font-body text-xs font-semibold tracking-[0.28em] text-muted-foreground uppercase">
          {content.eyebrow}
        </p>
        <h2
          className="mt-2 font-display font-bold text-primary"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
        >
          {content.titleLine1}
          <br />
          {content.titleLine2}
        </h2>
      </div>

      <div className="mb-10">
        <h3
          className="font-display font-bold text-primary"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}
        >
          {content.packsSectionTitle}
        </h3>
        <div
          className="mt-6 flex snap-x snap-mandatory overflow-x-auto pb-2"
          style={{ gap: "24px", scrollSnapType: "x mandatory" }}
        >
          {menuPacks.map((pack) => (
            <MenuPackCard key={pack.id} pack={pack} />
          ))}
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: "24px" }}>
        {PRODUCT_CLUSTERS.map((cluster) => (
          <ProductClusterPanel
            key={cluster.id}
            className="min-w-0"
            style={{ order: cluster.mobileOrder }}
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-6">
              {cluster.slots.map((slot) => {
                const item = showcase[slot.productIndex];
                if (!item) return null;

                return (
                  <div
                    key={item.id}
                    className={cn("min-w-0", slot.offsetClass)}
                  >
                    <LandingGridCard
                      product={item.product}
                      keyword={item.keyword}
                      imageHeightPx={slot.heightPx}
                      priority={
                        cluster.mobileOrder === 1 && slot.productIndex === 3
                      }
                    />
                  </div>
                );
              })}
            </div>
          </ProductClusterPanel>
        ))}
      </div>
    </SectionMesh>
  );
}
