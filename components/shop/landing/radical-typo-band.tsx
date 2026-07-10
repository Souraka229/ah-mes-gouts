"use client";

import type { TypoBandSectionContent } from "@/types/site-content";
import { TypoBandScroll } from "@/components/shop/landing/typo-band-scroll";
import { TypoBandRotate } from "@/components/shop/landing/typo-band-rotate";

type RadicalTypoBandSectionProps = {
  content: TypoBandSectionContent;
};

export function RadicalTypoBandSection({ content }: RadicalTypoBandSectionProps) {
  if (content.variant === "rotate") {
    return <TypoBandRotate messages={content.rotateMessages} />;
  }
  return <TypoBandScroll text={content.primaryText} />;
}
