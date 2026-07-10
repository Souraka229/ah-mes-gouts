"use client";

import type { PageSection } from "@/types/site-content";
import { TypoBandScroll } from "@/components/shop/landing/typo-band-scroll";
import { TypoBandRotate } from "@/components/shop/landing/typo-band-rotate";

type SectionPreviewProps = {
  section: PageSection;
};

export function SectionPreview({ section }: SectionPreviewProps) {
  const c = section.content;

  if (section.sectionKey === "hero") {
    const hero = c as PageSection<"hero">["content"];
    return (
      <div className="overflow-hidden rounded-xl bg-bg p-4">
        <p className="font-display text-3xl font-bold leading-tight text-primary">
          {hero.titleLine1}
          <br />
          {hero.titleLine2}
        </p>
        <p className="mt-2 font-body text-xs uppercase">
          {hero.sublinePrefix}{" "}
          <span className="bg-secondary/55 px-1">{hero.sublineHighlight}</span>
        </p>
        <div className="relative mt-3 aspect-[4/5] w-2/3 overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.imageUrl}
            alt=""
            className="size-full object-contain"
          />
          <span className="absolute left-2 top-2 bg-accent px-2 py-0.5 font-body text-[10px] font-semibold uppercase">
            {hero.menuBadgeLabel}
          </span>
        </div>
        <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 font-body text-xs">
          {hero.ctaLabel}
        </span>
      </div>
    );
  }

  if (section.sectionKey === "storytelling") {
    const story = c as PageSection<"storytelling">["content"];
    return (
      <div
        className="rounded-xl p-4"
        style={{
          background:
            "linear-gradient(135deg, #FAF7F5 0%, rgba(243, 201, 206, 0.15) 100%)",
        }}
      >
        <h3 className="font-display text-xl font-bold text-primary">
          {story.title}
        </h3>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          {story.body}
        </p>
      </div>
    );
  }

  if (section.sectionKey === "typo_band") {
    const typo = c as PageSection<"typo_band">["content"];
    return typo.variant === "rotate" ? (
      <TypoBandRotate messages={typo.rotateMessages} compact />
    ) : (
      <TypoBandScroll text={typo.primaryText} compact />
    );
  }

  if (section.sectionKey === "signature_moment") {
    const sig = c as PageSection<"signature_moment">["content"];
    return (
      <p className="font-display text-lg italic text-primary">{sig.text}</p>
    );
  }

  if (section.sectionKey === "gift_teaser") {
    const gift = c as PageSection<"gift_teaser">["content"];
    return (
      <div>
        <h3 className="font-display text-xl font-bold text-primary">
          {gift.title}
        </h3>
        <p className="mt-2 font-body text-xs text-muted-foreground">
          {gift.itemSlugs.join(" · ")}
        </p>
      </div>
    );
  }

  if (section.sectionKey === "product_grid") {
    const grid = c as PageSection<"product_grid">["content"];
    return (
      <div>
        <p className="font-body text-xs uppercase tracking-widest text-muted-foreground">
          {grid.eyebrow}
        </p>
        <h3 className="font-display text-xl font-bold text-primary">
          {grid.titleLine1}
          <br />
          {grid.titleLine2}
        </h3>
        <p className="mt-3 font-display text-lg text-primary">
          {grid.packsSectionTitle}
        </p>
      </div>
    );
  }

  return (
    <pre className="overflow-auto font-mono text-xs">
      {JSON.stringify(c, null, 2)}
    </pre>
  );
}
