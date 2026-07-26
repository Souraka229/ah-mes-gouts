type LandingShellProps = {
  children: React.ReactNode;
};

/** Conteneur landing — Server Component (overflow via CSS, pas d’effet client). */
export function LandingShell({ children }: LandingShellProps) {
  return <div className="overflow-x-hidden bg-bg">{children}</div>;
}
