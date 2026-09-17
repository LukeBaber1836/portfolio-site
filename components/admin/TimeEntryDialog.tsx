"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { saveEntryAction } from "@/app/admin/_actions/time";
import { ProjectPicker, type ProjectOption } from "@/components/admin/ProjectPicker";
import { FormField, TextArea, TextInput } from "@/components/shared/FormField";
import { DatePicker } from "@/components/shared/DatePicker";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type EditableEntry = {
  id: string;
  projectId: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  billable: boolean;
};

function durationLabel(start: string, end: string) {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh! * 60 + em! - (sh! * 60 + sm!);
  if (mins <= 0) mins += 24 * 60;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m${eh! * 60 + em! <= sh! * 60 + sm! ? " (past midnight)" : ""}`;
}

export function TimeEntryDialog({
  open,
  onOpenChange,
  entry,
  projects,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: EditableEntry | null;
  projects: ProjectOption[];
  today: string;
}) {
  const router = useRouter();
  const [v, setV] = useState(() => ({
    projectId: entry?.projectId ?? null,
    date: entry?.date ?? today,
    startTime: entry?.startTime ?? "09:00",
    endTime: entry?.endTime ?? "10:00",
    description: entry?.description ?? "",
    billable: entry?.billable ?? true,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorKey, setErrorKey] = useState(0);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    const res = await saveEntryAction(entry?.id ?? null, { ...v, projectId: v.projectId ?? "" });
    if (!res.ok) {
      setState("idle");
      setErrors(res.fieldErrors ?? {});
      setErrorKey((k) => k + 1);
      if (!res.fieldErrors) toast.error(res.error);
      return;
    }
    setState("success");
    toast.success(res.message);
    setTimeout(() => {
      onOpenChange(false);
      router.refresh();
    }, 350);
  }

  const duration = durationLabel(v.startTime, v.endTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">{entry ? "Edit time entry" : "Add time manually"}</DialogTitle>
          <DialogDescription className="text-white/50">For time you forgot to clock. Times are Central (Tyler, TX).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField label="Project" error={errors.projectId} errorKey={errorKey}>
            <ProjectPicker projects={projects} value={v.projectId} onChange={(id) => setV((s) => ({ ...s, projectId: id }))} />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Date" htmlFor="te-date" error={errors.date}>
              <DatePicker id="te-date" max={today} value={v.date} onChange={(d) => setV((s) => ({ ...s, date: d }))} />
            </FormField>
            <FormField label="Start" htmlFor="te-start" error={errors.startTime}>
              <TextInput id="te-start" type="time" step={300} value={v.startTime} onChange={(e) => setV((s) => ({ ...s, startTime: e.target.value }))} className="px-3 [color-scheme:dark]" />
            </FormField>
            <FormField label="End" htmlFor="te-end" error={errors.endTime}>
              <TextInput id="te-end" type="time" step={300} value={v.endTime} onChange={(e) => setV((s) => ({ ...s, endTime: e.target.value }))} className="px-3 [color-scheme:dark]" />
            </FormField>
          </div>
          {duration && <p className="-mt-1 text-xs text-white/50">Duration: <span className="text-white">{duration}</span></p>}
          <FormField label="What did you work on?" htmlFor="te-desc" error={errors.description} errorKey={errorKey} hint="Your client sees this.">
            <TextArea id="te-desc" rows={3} value={v.description} onChange={(e) => setV((s) => ({ ...s, description: e.target.value }))} />
          </FormField>
          <div className="flex items-center gap-2">
            <Switch id="te-billable" checked={v.billable} onCheckedChange={(c) => setV((s) => ({ ...s, billable: c }))} />
            <Label htmlFor="te-billable" className="text-sm font-normal text-white">
              Billable
            </Label>
          </div>
          <div className="flex justify-end">
            <SubmitButton state={state} pendingLabel="Saving…" successLabel="Saved">
              {entry ? "Save entry" : "Add entry"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
