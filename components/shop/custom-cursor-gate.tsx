"use client";

import { Suspense } from "react";

import { CustomCursor } from "@/components/shop/custom-cursor";

export function CustomCursorGate() {
  return (
    <Suspense fallback={null}>
      <CustomCursor />
    </Suspense>
  );
}
