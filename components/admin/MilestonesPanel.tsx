"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flag, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteMilestoneAction, reorderMilestonesAction, setMilestoneStatusAction } from "@/app/admin/_actions/projects";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type MilestoneRow = { id: string; title: string; status: string; dueDate: string | null; dueLabel: string | null };

function SortableMilestone({
  milestone: m,
  onToggle,
  onDelete,
}: {
  milestone: MilestoneRow;
  onToggle: (m: MilestoneRow) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id });
  const isDone = m.status === "done";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative flex items-start gap-2 rounded-xl p-2 transition-colors hover:bg-white/[0.03]",
        isDragging && "z-10 bg-white/[0.06] shadow-lg",
      )}
    >
      <button
        type="button"
        aria-label={`Reorder ${m.title}`}
        className="mt-0.5 cursor-grab touch-none rounded-md p-0.5 text-white/20 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-white/60 focus-visible:opacity-100 focus-visible:outline-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <Checkbox
        checked={isDone}
        onCheckedChange={() => onToggle(m)}
        aria-label={`Mark "${m.title}" ${isDone ? "not done" : "done"}`}
        className="mt-0.5 size-5 rounded-md data-[state=checked]:border-success data-[state=checked]:bg-success"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-6 transition-colors", isDone ? "text-white/40 line-through" : "text-white")}>{m.title}</p>
        {m.dueLabel && <p className="text-xs text-white/35">Due {m.dueLabel}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete milestone"
        className="shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-danger"
        onClick={() => onDelete(m.id)}
      >
        <Trash2 />
      </Button>
    </li>
  );
}

export function MilestonesPanel({ projectId, milestones }: { projectId: string; milestones: MilestoneRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Local copy so a drag lands instantly; re-synced during render whenever the
  // server sends new rows (React's "adjusting state when a prop changes" pattern).
  const [items, setItems] = useState(milestones);
  const [lastServerRows, setLastServerRows] = useState(milestones);
  if (milestones !== lastServerRows) {
    setLastServerRows(milestones);
    setItems(milestones);
  }
  const refresh = () => startTransition(() => router.refresh());

  const sensors = useSensors(
    // A few px of travel first, so clicking the checkbox never starts a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((m) => m.id === active.id);
    const to = items.findIndex((m) => m.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(items, from, to);
    setItems(next);
    const res = await reorderMilestonesAction(projectId, next.map((m) => m.id));
    if (!res.ok) {
      setItems(milestones);
      toast.error(res.error);
      return;
    }
    refresh();
  }

  async function toggle(m: MilestoneRow) {
    const res = await setMilestoneStatusAction(projectId, m.id, m.status === "done" ? "upcoming" : "done");
    if (!res.ok) return toast.error(res.error);
    if (res.message) toast.success(res.message);
    refresh();
  }

  async function remove(id: string) {
    const res = await deleteMilestoneAction(projectId, id);
    if (!res.ok) return toast.error(res.error);
    refresh();
  }

  if (items.length === 0) {
    return <EmptyState compact icon={Flag} title="No milestones" description="Break the project into checkpoints your client can follow." />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <ol className="relative space-y-1">
          {items.map((m) => (
            <SortableMilestone key={m.id} milestone={m} onToggle={toggle} onDelete={remove} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
