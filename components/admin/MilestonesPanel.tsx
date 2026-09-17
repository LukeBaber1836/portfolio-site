"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Flag, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteMilestoneAction,
  moveMilestoneAction,
  saveMilestoneAction,
  setMilestoneStatusAction,
} from "@/app/admin/_actions/projects";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormField, TextInput } from "@/components/shared/FormField";
import { DatePicker } from "@/components/shared/DatePicker";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type MilestoneRow = { id: string; title: string; status: string; dueDate: string | null; dueLabel: string | null };

export function MilestonesPanel({ projectId, milestones }: { projectId: string; milestones: MilestoneRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notify, setNotify] = useState(true);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const refresh = () => startTransition(() => router.refresh());

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    const res = await saveMilestoneAction(projectId, null, { title, dueDate });
    if (!res.ok) {
      setState("idle");
      setError(res.fieldErrors?.title ?? res.error);
      return;
    }
    setState("success");
    setTimeout(() => {
      setTitle("");
      setDueDate("");
      setState("idle");
      setAdding(false);
      refresh();
    }, 300);
  }

  async function toggle(m: MilestoneRow) {
    const next = m.status === "done" ? "upcoming" : "done";
    const res = await setMilestoneStatusAction(projectId, m.id, next, notify);
    if (!res.ok) return toast.error(res.error);
    if (res.message) toast.success(res.message, { description: notify && next === "done" ? "Client notified" : undefined });
    refresh();
  }

  const done = milestones.filter((m) => m.status === "done").length;

  return (
    <div className="space-y-4">
      {milestones.length > 0 && (
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>
            {done} of {milestones.length} complete
          </span>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} aria-label="Email client on complete" />
            Email client on complete
          </label>
        </div>
      )}

      {milestones.length === 0 && !adding ? (
        <EmptyState compact icon={Flag} title="No milestones" description="Break the project into checkpoints your client can follow." />
      ) : (
        <ol className="relative space-y-1">
          {milestones.map((m, i) => {
            const isDone = m.status === "done";
            return (
              <li key={m.id} className="group relative flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.03]">
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => toggle(m)}
                  aria-label={`Mark "${m.title}" ${isDone ? "not done" : "done"}`}
                  className="mt-0.5 size-5 rounded-md data-[state=checked]:border-success data-[state=checked]:bg-success"
                />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm leading-6 transition-colors", isDone ? "text-white/40 line-through" : "text-white")}>{m.title}</p>
                  {m.dueLabel && <p className="text-xs text-white/35">Due {m.dueLabel}</p>}
                </div>
                <div className="absolute right-1 top-1 flex rounded-lg bg-card/95 opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={async () => {
                      await moveMilestoneAction(projectId, m.id, "up");
                      refresh();
                    }}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={i === milestones.length - 1}
                    onClick={async () => {
                      await moveMilestoneAction(projectId, m.id, "down");
                      refresh();
                    }}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete milestone"
                    className="hover:text-danger"
                    onClick={async () => {
                      const res = await deleteMilestoneAction(projectId, m.id);
                      if (!res.ok) toast.error(res.error);
                      refresh();
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {adding ? (
        <form onSubmit={add} className="t-panel-slide space-y-3 rounded-xl border border-white/5 bg-background/50 p-3" data-open="true" style={{ ["--panel-translate-y" as string]: "8px" }}>
          <FormField label="Milestone" htmlFor="ms-title" error={error}>
            <TextInput id="ms-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Staging site review" />
          </FormField>
            <FormField label="Due date" htmlFor="ms-due" optional>
              <DatePicker id="ms-due" value={dueDate} onChange={setDueDate} />
            </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <SubmitButton state={state} size="sm" className="min-w-0" successLabel="Added">
              Add
            </SubmitButton>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus /> Add milestone
        </Button>
      )}
    </div>
  );
}
