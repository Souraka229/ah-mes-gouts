"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

import { ProductCard } from "@/components/shop/product-card";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

function SortableMenuCard({
  product,
  priority,
  onRemove,
}: {
  product: Product;
  priority: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "z-20 opacity-90",
      )}
    >
      <button
        type="button"
        className="absolute top-3 left-3 z-10 flex size-10 cursor-grab items-center justify-center rounded-full border border-border bg-background/95 shadow-sm active:cursor-grabbing"
        aria-label={`Déplacer ${product.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 z-10 flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-background/95 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label={`Retirer ${product.name} du menu`}
      >
        <Trash2 className="size-4 text-destructive" />
      </button>
      <div className="pointer-events-none ring-2 ring-transparent transition group-hover:ring-secondary/80 group-focus-within:ring-secondary/80 rounded-2xl">
        <ProductCard product={product} priority={priority} keyword="Du jour" />
      </div>
    </div>
  );
}

type StudioMenuProductGridProps = {
  products: Product[];
  onReorder: (orderedProductIds: string[]) => void;
  onRemove: (productId: string) => void;
};

export function StudioMenuProductGrid({
  products,
  onReorder,
  onRemove,
}: StudioMenuProductGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = products.map((p) => p.id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    onReorder(next);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:gap-6">
          {products.map((product, index) => (
            <SortableMenuCard
              key={product.id}
              product={product}
              priority={index < 4}
              onRemove={() => onRemove(product.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
