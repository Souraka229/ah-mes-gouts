"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/utils";

export type CatalogueTabId =
  | "menu"
  | "fleurs"
  | "nounours"
  | "vin"
  | "carte"
  | "all";

export const CATALOGUE_TAB_LABELS: ReadonlyArray<{
  id: CatalogueTabId;
  label: string;
}> = [
  { id: "menu", label: "Menu du jour" },
  { id: "fleurs", label: "Fleurs" },
  { id: "nounours", label: "Nounours" },
  { id: "vin", label: "Vin / Spiritueux" },
  { id: "carte", label: "Cartes & sur mesure" },
  { id: "all", label: "Toute la carte" },
];

const HINT_STORAGE_KEY = "amg_catalogue_tabs_hint_dismissed";

type Props = {
  activeTab: CatalogueTabId;
  onChange: (tab: CatalogueTabId) => void;
  /** Masquer « Menu du jour » si aucun produit menu (studio gère à part). */
  hideMenuTab?: boolean;
};

export function CatalogueCategoryTabs({
  activeTab,
  onChange,
  hideMenuTab,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<CatalogueTabId, HTMLButtonElement>>>(
    {},
  );
  const [edge, setEdge] = useState({ left: false, right: true });
  const [showHint, setShowHint] = useState(false);

  const tabs = hideMenuTab
    ? CATALOGUE_TAB_LABELS.filter((t) => t.id !== "menu")
    : CATALOGUE_TAB_LABELS;

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    setEdge({
      left: scrollLeft > 4,
      right: maxScroll > 4 && scrollLeft < maxScroll - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, [updateEdges, tabs.length]);

  useEffect(() => {
    const btn = tabRefs.current[activeTab];
    btn?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTab]);

  useEffect(() => {
    try {
      if (localStorage.getItem(HINT_STORAGE_KEY) === "1") return;
    } catch {
      return;
    }
    setShowHint(true);
    const t = window.setTimeout(() => setShowHint(false), 12_000);
    return () => window.clearTimeout(t);
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
    dismissHint();
  };

  const onScrollerScroll = () => {
    updateEdges();
    dismissHint();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = tabs.findIndex((t) => t.id === activeTab);
    if (e.key === "ArrowRight" && idx < tabs.length - 1) {
      e.preventDefault();
      onChange(tabs[idx + 1]!.id);
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      onChange(tabs[idx - 1]!.id);
    }
  };

  return (
    <div className="mb-6">
      <div className="relative">
        {edge.left ? (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent"
            aria-hidden
          />
        ) : null}
        {edge.right ? (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent"
            aria-hidden
          />
        ) : null}

        {edge.left ? (
          <button
            type="button"
            aria-label="Onglets précédents"
            onClick={() => scrollBy(-140)}
            className="absolute top-1/2 left-0.5 z-20 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-background/95 text-primary shadow-sm backdrop-blur-sm transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        ) : null}

        {edge.right ? (
          <button
            type="button"
            aria-label="Onglets suivants"
            onClick={() => scrollBy(140)}
            className="absolute top-1/2 right-0.5 z-20 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-background/95 text-primary shadow-sm backdrop-blur-sm transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        ) : null}

        <div
          ref={scrollerRef}
          onScroll={onScrollerScroll}
          onKeyDown={onKeyDown}
          className={cn(
            "flex gap-1.5 overflow-x-auto rounded-full border border-border/80 bg-muted/30 p-1 pl-1 pr-1",
            "snap-x snap-mandatory [-webkit-overflow-scrolling:touch]",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            edge.left && "pl-11",
            edge.right && "pr-11",
          )}
          role="tablist"
          aria-label="Sections du catalogue"
        >
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              ref={(node) => {
                if (node) tabRefs.current[id] = node;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={cn(
                "shrink-0 snap-center cursor-pointer rounded-full px-4 py-2.5 font-body text-sm font-semibold transition-colors",
                "min-h-11 touch-manipulation",
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/80 hover:text-primary",
              )}
              onClick={() => {
                dismissHint();
                onChange(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {showHint && edge.right ? (
          <p
            className="mt-2 text-center font-body text-[11px] text-muted-foreground"
            aria-live="polite"
          >
            Glissez pour voir menu, nounours, carte…
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CatalogueAlsoBrowse({
  exclude,
  hideMenu,
  onSelect,
  className,
}: {
  exclude: CatalogueTabId;
  hideMenu?: boolean;
  onSelect: (tab: CatalogueTabId) => void;
  className?: string;
}) {
  const items = CATALOGUE_TAB_LABELS.filter(
    (t) => t.id !== exclude && !(hideMenu && t.id === "menu"),
  );
  return (
    <div className={className}>
      <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Aussi chez nous
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="cursor-pointer rounded-full border border-border bg-background px-3 py-1.5 font-body text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
