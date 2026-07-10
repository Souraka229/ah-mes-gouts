"use client";

import { useEffect } from "react";

type LandingShellProps = {
  children: React.ReactNode;
};

/** Gère overflow-x sur body pour les débordements volontaires du hero et des bandes typo. */
export function LandingShell({ children }: LandingShellProps) {
  useEffect(() => {
    const previous = document.body.style.overflowX;
    document.body.style.overflowX = "hidden";
    return () => {
      document.body.style.overflowX = previous;
    };
  }, []);

  return <div className="overflow-x-hidden bg-bg">{children}</div>;
}
