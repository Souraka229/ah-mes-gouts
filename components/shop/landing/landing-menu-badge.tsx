import type { CSSProperties } from "react";
import Link from "next/link";

type LandingMenuBadgeProps = {
  label: string;
  className?: string;
  style?: CSSProperties;
  href?: string;
};

function BadgeInner({ label }: { label: string }) {
  return (
    <>
      <span
        className="relative flex shrink-0 items-center justify-center"
        aria-hidden
      >
        <span
          className="absolute animate-ping rounded-full bg-emerald-500 opacity-75"
          style={{
            width: "6px",
            height: "6px",
            animationDuration: "2s",
          }}
        />
        <span
          className="relative rounded-full bg-emerald-600"
          style={{ width: "6px", height: "6px" }}
        />
      </span>
      {label}
    </>
  );
}

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  borderRadius: "999px",
  border: "1px solid #A88950",
  backgroundColor: "#C9A96E",
  boxShadow: "0 2px 8px rgba(59,31,77,0.15)",
  padding: "6px 12px",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#241726",
};

/** Badge pilule « Menu du jour actif » — valeurs charte exactes. */
export function LandingMenuBadge({
  label,
  className,
  style,
  href,
}: LandingMenuBadgeProps) {
  const mergedStyle = { ...badgeStyle, ...style };

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        style={mergedStyle}
        aria-label={`${label} — voir le menu du jour`}
      >
        <BadgeInner label={label} />
      </Link>
    );
  }

  return (
    <div className={className} style={mergedStyle}>
      <BadgeInner label={label} />
    </div>
  );
}
