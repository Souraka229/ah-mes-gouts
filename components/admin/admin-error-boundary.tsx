"use client";

import { SectionErrorBoundary } from "@/components/shared/section-error-boundary";

export function AdminErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionErrorBoundary sectionName="Administration">
      {children}
    </SectionErrorBoundary>
  );
}
