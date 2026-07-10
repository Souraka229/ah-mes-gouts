"use client";

import Image from "next/image";
import { useMemo, useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

import { LANDING_IMAGES } from "@/lib/landing-data";
import { SITE_NAME } from "@/lib/seo/site";
import type { SignatureMomentSectionContent } from "@/types/site-content";

export function RadicalSignatureMomentSection({
  content,
}: {
  content: SignatureMomentSectionContent;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.75", "end 0.25"],
  });

  const words = useMemo(() => content.text.split(" "), [content.text]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[80vh] w-full py-[6vh]"
      aria-label="Moment signature"
    >
      <div className="relative mx-auto min-h-[80vh] w-full max-w-[100vw]">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={LANDING_IMAGES.tiramisuPoster}
            alt={`Tiramisu Caramel — création signature ${SITE_NAME}`}
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority={false}
          />
          <div className="absolute inset-0 bg-primary/55" aria-hidden />
        </div>

        <div
          className="relative z-10 flex min-h-[80vh] flex-col justify-end px-[6vw] pb-[12vh]"
          style={{ marginLeft: "4vw" }}
        >
          <p
            className="max-w-[min(92vw,900px)] font-display font-bold leading-[1.05] tracking-[-0.02em] text-white"
            style={{ fontSize: "clamp(2.25rem, 6.5vw, 5rem)" }}
          >
            {words.map((word, index) => (
              <ScrollWord
                key={`${word}-${index}`}
                word={word}
                index={index}
                total={words.length}
                progress={scrollYProgress}
                reduceMotion={reduceMotion ?? false}
              />
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}

type ScrollWordProps = {
  word: string;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  reduceMotion: boolean;
};

function ScrollWord({
  word,
  index,
  total,
  progress,
  reduceMotion,
}: ScrollWordProps) {
  const start = (index / total) * 0.65;
  const end = start + 0.22;

  const opacity = useTransform(
    progress,
    [start, end],
    reduceMotion ? [1, 1] : [0.08, 1],
  );

  const y = useTransform(
    progress,
    [start, end],
    reduceMotion ? [0, 0] : [18, 0],
  );

  return (
    <motion.span
      style={{ opacity, y }}
      className="mr-[0.28em] inline-block"
    >
      {word}
    </motion.span>
  );
}
