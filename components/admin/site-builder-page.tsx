"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye,
  EyeOff,
  GripVertical,
  History,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { SectionPreview } from "@/components/admin/section-preview";
import { SITE_NAME } from "@/lib/seo/site";
import { cn } from "@/lib/utils";
import type {
  PageSection,
  SectionKey,
  SectionVersionSnapshot,
  SitePageId,
} from "@/types/site-content";

const PAGE_OPTIONS: { id: SitePageId; label: string }[] = [
  { id: "home", label: "Accueil" },
  { id: "catalogue", label: "Catalogue" },
  { id: "livraison", label: "Livraison" },
  { id: "contact", label: "Contact" },
];

const SECTION_LABELS: Record<SectionKey, string> = {
  hero: "Hero",
  gift_teaser: "Bande cadeau",
  product_grid: "Menu du jour",
  storytelling: "Storytelling",
  typo_band: "Bande typographique",
  signature_moment: "Moment signature",
  footer: "Pied de page",
};

function CharCounter({
  value,
  max,
  warnAt,
}: {
  value: string;
  max: number;
  warnAt?: number;
}) {
  const len = value.length;
  const threshold = warnAt ?? max - 5;
  const danger = len >= threshold;
  return (
    <p
      className={cn(
        "mt-1 text-right font-body text-xs",
        danger ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {len}/{max}
      {danger && len >= max - 2 && (
        <span className="ml-1">
          — Au-delà, le texte risque de déborder sur mobile
        </span>
      )}
    </p>
  );
}

function SortableRow({
  section,
  selected,
  onSelect,
  onToggleVisible,
}: {
  section: PageSection;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-white p-2",
        selected ? "border-primary shadow-sm" : "border-border",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-bg"
        {...attributes}
        {...listeners}
        aria-label="Réordonner"
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left font-body text-sm"
      >
        <span className="font-medium text-text">
          {SECTION_LABELS[section.sectionKey]}
        </span>
        {!section.isVisible && (
          <span className="ml-2 text-xs text-muted-foreground">(masquée)</span>
        )}
      </button>
      <button
        type="button"
        onClick={onToggleVisible}
        className="rounded-lg p-1.5 hover:bg-bg"
        aria-label={section.isVisible ? "Masquer" : "Afficher"}
      >
        {section.isVisible ? (
          <Eye className="size-4 text-primary" />
        ) : (
          <EyeOff className="size-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload échoué");
      onChange(data.url!);
      toast.success("Image téléversée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload échoué");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="font-body text-sm font-medium text-text">{label}</label>
      <div className="mt-2 flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-bg">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ex: /images/catalog/mango-passion.webp"
            className="w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
          <label className="inline-flex cursor-pointer items-center gap-2 font-body text-xs text-primary">
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Téléverser une image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function SectionForm({
  section,
  onChange,
}: {
  section: PageSection;
  onChange: (content: PageSection["content"]) => void;
}) {
  const c = section.content;

  if (section.sectionKey === "hero") {
    const hero = c as PageSection<"hero">["content"];
    return (
      <div className="space-y-4">
        <div>
          <label className="font-body text-sm font-medium">Titre ligne 1</label>
          <input
            value={hero.titleLine1}
            onChange={(e) => onChange({ ...hero, titleLine1: e.target.value })}
            placeholder="Ex: L'instant qui"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
          <CharCounter value={hero.titleLine1} max={40} />
        </div>
        <div>
          <label className="font-body text-sm font-medium">Titre ligne 2</label>
          <input
            value={hero.titleLine2}
            onChange={(e) => onChange({ ...hero, titleLine2: e.target.value })}
            placeholder="Ex: fond"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
          <CharCounter value={hero.titleLine2} max={40} />
        </div>
        <div>
          <label className="font-body text-sm font-medium">Sous-titre</label>
          <input
            value={hero.sublinePrefix}
            onChange={(e) => onChange({ ...hero, sublinePrefix: e.target.value })}
            placeholder="Ex: Glaces & entremets artisanaux —"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
        </div>
        <div>
          <label className="font-body text-sm font-medium">Mise en avant</label>
          <input
            value={hero.sublineHighlight}
            onChange={(e) =>
              onChange({ ...hero, sublineHighlight: e.target.value })
            }
            placeholder="Ex: Cotonou"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
        </div>
        <ImageField
          label="Image hero"
          value={hero.imageUrl}
          onChange={(imageUrl) => onChange({ ...hero, imageUrl })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="font-body text-sm font-medium">Texte CTA</label>
            <input
              value={hero.ctaLabel}
              onChange={(e) => onChange({ ...hero, ctaLabel: e.target.value })}
              placeholder="Ex: La carte"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
            />
          </div>
          <div>
            <label className="font-body text-sm font-medium">Lien CTA</label>
            <input
              value={hero.ctaHref}
              onChange={(e) => onChange({ ...hero, ctaHref: e.target.value })}
              placeholder="Ex: /catalogue"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
            />
          </div>
        </div>
        <div>
          <label className="font-body text-sm font-medium">Badge menu</label>
          <input
            value={hero.menuBadgeLabel}
            onChange={(e) =>
              onChange({ ...hero, menuBadgeLabel: e.target.value })
            }
            placeholder="Ex: Menu du jour actif"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
        </div>
      </div>
    );
  }

  if (section.sectionKey === "gift_teaser") {
    const gift = c as PageSection<"gift_teaser">["content"];
    return (
      <div className="space-y-4">
        <div>
          <label className="font-body text-sm font-medium">Titre</label>
          <input
            value={gift.title}
            onChange={(e) => onChange({ ...gift, title: e.target.value })}
            placeholder="Ex: Et si c'était un cadeau ?"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
        </div>
        <p className="font-body text-xs text-muted-foreground">
          Produits cadeau : slugs séparés par des virgules (catalogue admin).
        </p>
        <input
          value={gift.itemSlugs.join(", ")}
          onChange={(e) =>
            onChange({
              ...gift,
              itemSlugs: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="nounours-beige, bouquet-roses, carte-cadeau"
          className="w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
        />
      </div>
    );
  }

  if (section.sectionKey === "product_grid") {
    const grid = c as PageSection<"product_grid">["content"];
    return (
      <div className="space-y-4">
        {(
          [
            ["eyebrow", "Surtitre", "Ex: La carte"],
            ["titleLine1", "Titre ligne 1", "Ex: Quatre textures,"],
            ["titleLine2", "Titre ligne 2", "Ex: zéro grille régulière"],
            ["packsSectionTitle", "Titre formules", "Ex: Nos formules du jour"],
          ] as const
        ).map(([key, label, ph]) => (
          <div key={key}>
            <label className="font-body text-sm font-medium">{label}</label>
            <input
              value={grid[key]}
              onChange={(e) => onChange({ ...grid, [key]: e.target.value })}
              placeholder={ph}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
            />
          </div>
        ))}
      </div>
    );
  }

  if (section.sectionKey === "storytelling") {
    const story = c as PageSection<"storytelling">["content"];
    return (
      <div className="space-y-4">
        <div>
          <label className="font-body text-sm font-medium">Titre</label>
          <input
            value={story.title}
            onChange={(e) => onChange({ ...story, title: e.target.value })}
            placeholder={`Ex: Pourquoi ${SITE_NAME}`}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
        </div>
        <div>
          <label className="font-body text-sm font-medium">Texte narratif</label>
          <textarea
            value={story.body}
            onChange={(e) => onChange({ ...story, body: e.target.value })}
            rows={5}
            placeholder="Racontez l'origine de la marque en 3-4 phrases (passion, savoir-faire, promesse client)…"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
          <CharCounter value={story.body} max={600} warnAt={550} />
        </div>
        <ImageField
          label="Photo"
          value={story.imageUrl}
          onChange={(imageUrl) => onChange({ ...story, imageUrl })}
        />
      </div>
    );
  }

  if (section.sectionKey === "typo_band") {
    const typo = c as PageSection<"typo_band">["content"];
    return (
      <div className="space-y-4">
        <div>
          <label className="font-body text-sm font-medium">Mode d&apos;affichage</label>
          <select
            value={typo.variant}
            onChange={(e) =>
              onChange({
                ...typo,
                variant: e.target.value as "scroll" | "rotate",
              })
            }
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          >
            <option value="scroll">Défilement lent (droite → gauche)</option>
            <option value="rotate">Rotation statique (fade 4s)</option>
          </select>
        </div>
        <div>
          <label className="font-body text-sm font-medium">Texte principal</label>
          <input
            value={typo.primaryText}
            onChange={(e) => onChange({ ...typo, primaryText: e.target.value })}
            placeholder="Ex: Ici, chaque bouchée fond…"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
          <CharCounter value={typo.primaryText} max={120} />
        </div>
        {typo.variant === "rotate" && (
          <div>
            <label className="font-body text-sm font-medium">
              Messages en rotation (un par ligne)
            </label>
            <textarea
              value={typo.rotateMessages.join("\n")}
              onChange={(e) =>
                onChange({
                  ...typo,
                  rotateMessages: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              rows={4}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
            />
          </div>
        )}
      </div>
    );
  }

  if (section.sectionKey === "signature_moment") {
    const sig = c as PageSection<"signature_moment">["content"];
    return (
      <div>
        <label className="font-body text-sm font-medium">Citation</label>
        <textarea
          value={sig.text}
          onChange={(e) => onChange({ ...sig, text: e.target.value })}
          rows={3}
          placeholder="Ex: Une texture qui reste…"
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
        />
        <CharCounter value={sig.text} max={160} />
      </div>
    );
  }

  if (section.sectionKey === "footer") {
    const foot = c as PageSection<"footer">["content"];
    return (
      <div className="space-y-4">
        <div>
          <label className="font-body text-sm font-medium">Téléphone</label>
          <input
            value={foot.phone}
            onChange={(e) => onChange({ ...foot, phone: e.target.value })}
            placeholder="Ex: +229 97 31 07 42"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
        </div>
        <div>
          <label className="font-body text-sm font-medium">Instagram</label>
          <input
            value={foot.instagramHandle}
            onChange={(e) =>
              onChange({ ...foot, instagramHandle: e.target.value })
            }
            placeholder="Ex: @ahmesgouts"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-body text-sm"
          />
        </div>
      </div>
    );
  }

  return null;
}

export function SiteBuilderPage() {
  const [page, setPage] = useState<SitePageId>("home");
  const [drafts, setDrafts] = useState<PageSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [history, setHistory] = useState<SectionVersionSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/site-content?page=${page}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { drafts: PageSection[] };
      setDrafts(data.drafts ?? []);
      setSelectedId((prev) => prev ?? data.drafts?.[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = drafts.find((s) => s.id === selectedId) ?? drafts[0];

  const patchSection = async (
    sectionId: string,
    patch: { isVisible?: boolean; content?: PageSection["content"] },
  ) => {
    const res = await fetch("/api/admin/site-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, ...patch }),
    });
    const data = (await res.json()) as { section?: PageSection; error?: string };
    if (!res.ok) {
      toast.error(data.error ?? "Erreur");
      return;
    }
    if (data.section) {
      setDrafts((prev) =>
        prev.map((s) => (s.id === data.section!.id ? data.section! : s)),
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = drafts.findIndex((s) => s.id === active.id);
    const newIndex = drafts.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(drafts, oldIndex, newIndex);
    setDrafts(reordered);
    const res = await fetch("/api/admin/site-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder",
        page,
        orderedIds: reordered.map((s) => s.id),
      }),
    });
    if (!res.ok) toast.error("Réordonnancement échoué");
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", page }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success("Contenu publié sur le site");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publication échouée");
    } finally {
      setPublishing(false);
    }
  };

  const loadHistory = async () => {
    if (!selected) return;
    const res = await fetch("/api/admin/site-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "history",
        sectionId: selected.id,
      }),
    });
    const data = (await res.json()) as { history: SectionVersionSnapshot[] };
    setHistory(data.history ?? []);
    setShowHistory(true);
  };

  const restore = async (versionId: string) => {
    const res = await fetch("/api/admin/site-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", versionId }),
    });
    const data = (await res.json()) as { section?: PageSection };
    if (data.section) {
      setDrafts((prev) =>
        prev.map((s) => (s.id === data.section!.id ? data.section! : s)),
      );
      toast.success("Version restaurée (brouillon)");
      setShowHistory(false);
    }
  };

  if (page !== "home") {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center">
        <p className="font-display text-xl text-primary">
          Page « {page} » — éditeur à venir
        </p>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          L&apos;accueil est entièrement éditable. Les autres pages seront branchées
          sur le même modèle.
        </p>
        <button
          type="button"
          onClick={() => setPage("home")}
          className="mt-4 rounded-xl bg-primary px-4 py-2 font-body text-sm text-white"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">
            Éditeur de site
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Brouillon local — rien n&apos;est public tant que vous n&apos;avez pas
            cliqué Publier.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={page}
            onChange={(e) => {
              setPage(e.target.value as SitePageId);
              setSelectedId(null);
            }}
            className="rounded-xl border border-border bg-white px-3 py-2 font-body text-sm"
          >
            {PAGE_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={publishing}
            className="rounded-xl bg-primary px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-60"
          >
            {publishing ? "Publication…" : "Publier"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[280px_1fr_1fr]">
          <div className="space-y-2">
            <p className="font-body text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Sections
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => void handleDragEnd(e)}
            >
              <SortableContext
                items={drafts.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {drafts.map((section) => (
                  <SortableRow
                    key={section.id}
                    section={section}
                    selected={section.id === selected?.id}
                    onSelect={() => setSelectedId(section.id)}
                    onToggleVisible={() =>
                      void patchSection(section.id, {
                        isVisible: !section.isVisible,
                      })
                    }
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            {selected ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-primary">
                    {SECTION_LABELS[selected.sectionKey]}
                  </h2>
                  <button
                    type="button"
                    onClick={() => void loadHistory()}
                    className="flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-primary"
                  >
                    <History className="size-3.5" />
                    Historique
                  </button>
                </div>
                <SectionForm
                  section={selected}
                  onChange={(content) => {
                    setDrafts((prev) =>
                      prev.map((s) =>
                        s.id === selected.id ? { ...s, content } : s,
                      ),
                    );
                    void patchSection(selected.id, { content });
                  }}
                />
              </>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-bg p-4">
            <p className="mb-3 font-body text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Aperçu en direct
            </p>
            {selected ? (
              <SectionPreview section={selected} />
            ) : null}
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-primary">
              Historique (10 dernières versions)
            </h3>
            <ul className="mt-4 space-y-2">
              {history.length === 0 ? (
                <li className="font-body text-sm text-muted-foreground">
                  Aucune version publiée pour cette section.
                </li>
              ) : (
                history.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="font-body text-xs">
                      <p className="font-medium text-text">
                        {new Date(v.publishedAt).toLocaleString("fr-FR")}
                      </p>
                      <p className="text-muted-foreground">par {v.publishedBy}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void restore(v.id)}
                      className="rounded-lg bg-bg px-2 py-1 font-body text-xs text-primary hover:bg-muted"
                    >
                      Restaurer
                    </button>
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="mt-4 w-full rounded-xl border border-border py-2 font-body text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
