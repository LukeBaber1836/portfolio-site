"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { quickUpdateProjectAction } from "@/app/admin/_actions/projects";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { FieldSelect, FieldSelectItem } from "@/components/shared/FieldSelect";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Project } from "@/lib/db/schema";
import { PROJECT_STATUS } from "@/lib/status";

export function ProjectQuickControls({
  project,
  clients,
  defaultRateCents,
}: {
  project: Project;
  clients: { id: string; name: string; company: string | null }[];
  defaultRateCents: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [progress, setProgress] = useState(project.progressPct);
  const [editOpen, setEditOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(patch: { status?: string; progressPct?: number }) {
    const res = await quickUpdateProjectAction(project.id, patch);
    if (!res.ok) toast.error(res.error);
    else startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="quick-status">
        Status
      </label>
      <FieldSelect
        label="Status"
        defaultValue={project.status}
        onValueChange={(value) => {
          save({ status: value });
          toast.success(`Status: ${PROJECT_STATUS[value]?.label}`);
        }}
        className="h-9 w-48 rounded-full text-xs"
      >
        {Object.entries(PROJECT_STATUS).map(([value, def]) => (
          <FieldSelectItem key={value} value={value}>
            {def.label}
          </FieldSelectItem>
        ))}
      </FieldSelect>
      <div className="flex h-9 items-center gap-2 rounded-full border border-white/10 px-3">
        <label htmlFor="quick-progress" className="text-xs text-white/50">
          Progress
        </label>
        <input
          id="quick-progress"
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => {
            const value = Number(e.target.value);
            setProgress(value);
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => save({ progressPct: value }), 400);
          }}
          className="w-28 cursor-pointer accent-[#f3d076]"
        />
        <span className="w-9 text-right text-xs tabular-nums text-white">{progress}%</span>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil /> Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit project</DialogTitle>
          </DialogHeader>
          <ProjectForm project={project} clients={clients} defaultRateCents={defaultRateCents} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
