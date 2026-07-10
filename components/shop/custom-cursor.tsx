"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const CURSOR_SIZE_PX = 32;
const LERP = 0.15;
const HOVER_SCALE = 1.8;

/**
 * Curseur personnalisé desktop — activer via ?fx=cursor ou NEXT_PUBLIC_ENABLE_CUSTOM_CURSOR=true
 */
export function CustomCursor() {
  const searchParams = useSearchParams();
  const enabled =
    searchParams.get("fx") === "cursor" ||
    process.env.NEXT_PUBLIC_ENABLE_CUSTOM_CURSOR === "true";

  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const [visible, setVisible] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    document.documentElement.classList.add("custom-cursor-active");

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
    };
    const onLeave = () => setVisible(false);

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      scaleRef.current = el.closest(
        "a, button, [role='button'], input, select, textarea, label, [data-cursor-hover]",
      )
        ? HOVER_SCALE
        : 1;
    };

    let raf = 0;
    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * LERP;
      current.current.y += (target.current.y - current.current.y) * LERP;
      const ring = ringRef.current;
      if (ring) {
        const s = scaleRef.current;
        const half = (CURSOR_SIZE_PX * s) / 2;
        ring.style.transform = `translate(${current.current.x - half}px, ${current.current.y - half}px) scale(${s})`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    document.addEventListener("mouseover", onOver);
    raf = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      document.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ringRef}
      className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full border border-accent bg-transparent transition-[width,height] duration-200"
      style={{
        width: CURSOR_SIZE_PX,
        height: CURSOR_SIZE_PX,
        opacity: visible ? 1 : 0,
      }}
      aria-hidden
    />
  );
}
