"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { saveEntryAction } from "@/app/admin/_actions/time";
import { ProjectPicker, type ProjectOption } from "@/components/admin/ProjectPicker";
import { FormField, TextArea } from "@/components/shared/FormField";
import { DatePicker } from "@/components/shared/DatePicker";
import { TimePicker } from "@/components/shared/TimePicker";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type EditableEntry = {
  id: string;
  projectId: string;
  date: string;
  startTime: string;
  endDate: string;
  endTime: string;
  description: string;
  billable: boolean;
};

function minutesOf(date: string, time: string) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  return Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2])) / 60_000;
}

function durationLabel(v: { date: string; startTime: string; endDate: string; endTime: string }) {
  const start = minutesOf(v.date, v.startTime);
  const end = minutesOf(v.endDate, v.endTime);
  if (start == null || end == null) return null;
  const mins = end - start;
  if (mins <= 0) return { text: "End must be after start", bad: true };
  return { text: `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`, bad: mins > 24 * 60 };
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
    endDate: entry?.endDate ?? entry?.date ?? today,
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

  const duration = durationLabel(v);

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
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start date" htmlFor="te-date" error={errors.date}>
              <DatePicker
                id="te-date"
                max={today}
                value={v.date}
                // Moving the start keeps the end on the same day offset (same day, or the next one).
                onChange={(d) => setV((s) => ({ ...s, date: d, endDate: s.endDate === s.date || s.endDate < d ? d : s.endDate }))}
              />
            </FormField>
            <FormField label="Start time" htmlFor="te-start" error={errors.startTime}>
              <TimePicker id="te-start" value={v.startTime} onChange={(t) => setV((s) => ({ ...s, startTime: t }))} />
            </FormField>
            <FormField label="End date" htmlFor="te-end-date" error={errors.endDate}>
              <DatePicker id="te-end-date" max={today} value={v.endDate} onChange={(d) => setV((s) => ({ ...s, endDate: d }))} />
            </FormField>
            <FormField label="End time" htmlFor="te-end" error={errors.endTime}>
              <TimePicker id="te-end" value={v.endTime} onChange={(t) => setV((s) => ({ ...s, endTime: t }))} />
            </FormField>
          </div>
          {duration && (
            <p className="-mt-1 text-xs text-white/50">
              Duration: <span className={duration.bad ? "text-danger" : "text-white"}>{duration.text}</span>
            </p>
          )}
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
