import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ProductClusterPanelProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** Panneau de regroupement — cards produit jamais isolées dans le vide. */
export function ProductClusterPanel({
  children,
  className,
  style,
}: ProductClusterPanelProps) {
  return (
    <div
      className={cn("rounded-[24px] bg-[#FFFDFB]", className)}
      style={{ padding: "32px", ...style }}
    >
      {children}
    </div>
  );
}
