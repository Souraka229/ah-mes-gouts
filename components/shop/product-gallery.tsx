"use client";

import Image from "next/image";
import { useState } from "react";

import { getProductAltText } from "@/lib/seo/images";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: string[];
  productName: string;
  priority?: boolean;
};

export function ProductGallery({
  images,
  productName,
  priority = false,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const mainAlt = getProductAltText(
    productName,
    "vue principale en gros plan",
  );

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative aspect-[4/5] overflow-hidden rounded-3xl bg-bg",
          "group transition-transform duration-[250ms] motion-reduce:transition-none",
          "lg:hover:scale-[1.02]",
        )}
      >
        <Image
          src={images[activeIndex] ?? images[0]!}
          alt={mainAlt}
          fill
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={cn(
            "object-contain object-center transition-transform duration-500 motion-reduce:transition-none",
            "lg:group-hover:scale-[1.03] motion-reduce:lg:group-hover:scale-100",
          )}
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={`${index}-${image}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 bg-bg transition-colors duration-200",
                index === activeIndex
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
              aria-label={`Voir l'image ${index + 1} de ${productName}`}
              aria-current={index === activeIndex}
            >
              <Image
                src={image}
                alt={getProductAltText(
                  productName,
                  `miniature ${index + 1}`,
                )}
                fill
                sizes="80px"
                loading="lazy"
                className="object-contain object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
