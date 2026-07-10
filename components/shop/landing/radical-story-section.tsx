"use client";

import Image from "next/image";

import { SectionMesh } from "@/components/shop/landing/section-mesh";
import { SITE_NAME } from "@/lib/seo/site";
import type { StorytellingSectionContent } from "@/types/site-content";

export function RadicalStorySection({
  content,
}: {
  content: StorytellingSectionContent;
}) {
  return (
    <SectionMesh
      variant="storytelling"
      className="py-[10vh]"
      aria-label={`Pourquoi ${SITE_NAME}`}
    >
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-10">
        <div className="relative z-10 order-2 lg:order-1">
          <h2
            className="font-display font-bold text-primary"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
          >
            {content.title}
          </h2>
          <p className="mt-6 max-w-lg font-body text-base leading-relaxed text-muted-foreground">
            {content.body}
          </p>
        </div>

        <div className="relative order-1 flex justify-end lg:order-2 lg:min-h-[420px]">
          <div className="landing-story-photo relative aspect-[4/5] w-[min(72vw,380px)] md:w-[min(42vw,420px)]">
            <div className="relative h-full w-full overflow-hidden rounded-2xl bg-bg shadow-xl">
              <Image
                src={content.imageUrl}
                alt={`Création artisanale ${SITE_NAME}`}
                fill
                sizes="(max-width: 768px) 72vw, 420px"
                className="object-cover object-center"
                unoptimized={content.imageUrl.endsWith(".png")}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionMesh>
  );
}
