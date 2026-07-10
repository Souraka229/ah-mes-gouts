import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionMeshVariant = "hero" | "product-grid" | "storytelling" | "default";

const MESH_STYLES: Record<SectionMeshVariant, CSSProperties> = {
  hero: {
    background:
      "radial-gradient(circle at 20% 30%, rgba(243, 201, 206, 0.25) 0%, transparent 60%)",
  },
  storytelling: {
    background:
      "linear-gradient(135deg, #FAF7F5 0%, rgba(243, 201, 206, 0.15) 100%)",
  },
  default: {
    background:
      "radial-gradient(circle at 80% 20%, rgba(243, 201, 206, 0.08) 0%, transparent 55%)",
  },
  "product-grid": {},
};

type SectionMeshProps = {
  variant: SectionMeshVariant;
  children: ReactNode;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

/** Arrière-plan de section avec mesh CSS — jamais d'image pour les blobs produits. */
export function SectionMesh({
  variant,
  children,
  className,
  id,
  "aria-label": ariaLabel,
}: SectionMeshProps) {
  return (
    <section
      id={id}
      className={cn("relative overflow-hidden", className)}
      aria-label={ariaLabel}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={MESH_STYLES[variant]}
        aria-hidden
      />

      {variant === "product-grid" && (
        <>
          <div
            className="pointer-events-none absolute z-0"
            style={{
              top: "-10%",
              left: "-8%",
              width: "55%",
              height: "55%",
              background:
                "radial-gradient(circle, rgba(59, 31, 77, 0.08) 0%, transparent 70%)",
              filter: "blur(120px)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute z-0"
            style={{
              right: "-6%",
              bottom: "-8%",
              width: "50%",
              height: "50%",
              background:
                "radial-gradient(circle, rgba(201, 169, 110, 0.1) 0%, transparent 70%)",
              filter: "blur(120px)",
            }}
            aria-hidden
          />
        </>
      )}

      <div className="relative z-[1]">{children}</div>
    </section>
  );
}
