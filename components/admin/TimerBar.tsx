"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Pause, Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { discardTimerAction, setTimerPausedAction, startTimerAction, stopTimerAction } from "@/app/admin/_actions/time";
import { ProjectPicker, type ProjectOption } from "@/components/admin/ProjectPicker";
import { FormField, TextArea, TextInput } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { formatClock, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export type RunningTimer = {
  id: string;
  startedAt: string;
  pausedAt: string | null;
  pausedSeconds: number;
  description: string | null;
  projectName: string;
  clientName: string;
} | null;

type PauseState = { pausedAt: string | null; pausedSeconds: number };

/** Worked seconds: wall time since start, minus finished pauses, frozen at the current pause. */
function useElapsed(running: { startedAt: string } | null, pause: PauseState) {
  const [now, setNow] = useState(() => Date.now());
  const ticking = !!running && !pause.pausedAt;
  useEffect(() => {
    if (!ticking) return;
    // Tick immediately on resume so the clock doesn't briefly read from the stale pre-pause `now`.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [ticking]);
  if (!running) return 0;
  const until = pause.pausedAt ? new Date(pause.pausedAt).getTime() : now;
  return Math.max(0, (until - new Date(running.startedAt).getTime()) / 1000 - pause.pausedSeconds);
}

/** Persistent clock-in / clock-out control in the admin top bar. Start time is server-authoritative. */
export function TimerBar({ running, projects }: { running: RunningTimer; projects: ProjectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(projects[0]?.lastLoggedAt ? projects[0].id : null);
  // Clock-in note while idle; once running, a draft keyed to that entry (prefilled from its clock-in note).
  const [idleNote, setIdleNote] = useState("");
  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null);
  const description = running ? (draft?.id === running.id ? draft.text : (running.description ?? "")) : idleNote;
  const setDescription = (text: string) => (running ? setDraft({ id: running.id, text }) : setIdleNote(text));
  const [billable, setBillable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [, startTransition] = useTransition();
  // Optimistic pause/resume, dropped once the server's pausedAt moves past the value it was based on.
  const [pauseOverride, setPauseOverride] = useState<(PauseState & { id: string; basePausedAt: string | null }) | null>(null);
  const pause: PauseState =
    running && pauseOverride?.id === running.id && pauseOverride.basePausedAt === running.pausedAt
      ? pauseOverride
      : { pausedAt: running?.pausedAt ?? null, pausedSeconds: running?.pausedSeconds ?? 0 };
  const isPaused = !!pause.pausedAt;
  const elapsed = useElapsed(running, pause);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // "T" toggles the timer panel when not typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key.toLowerCase() !== "t" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (target.closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || !running) return;
    const t = setTimeout(() => descRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open, running]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setError(null);
      setState("idle");
    }
  };

  const fail = (msg: string) => {
    setError(msg);
    setErrorKey((k) => k + 1);
    setState("idle");
  };

  async function clockIn(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return fail("Pick a project to clock in.");
    setState("pending");
    const res = await startTimerAction({ projectId, description });
    if (!res.ok) return fail(res.error);
    setState("success");
    toast.success("Clocked in", { description: projects.find((p) => p.id === projectId)?.name });
    setTimeout(() => {
      onOpenChange(false);
      setIdleNote("");
    }, 450);
    startTransition(() => router.refresh());
  }

  async function clockOut(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 3) return fail("Add a short description of what you worked on.");
    setState("pending");
    const res = await stopTimerAction({ description, billable });
    if (!res.ok) return fail(res.error);
    setState("success");
    toast.success(`Saved ${formatDuration(res.data.seconds)}`, { description: running?.projectName });
    setTimeout(() => {
      onOpenChange(false);
      setDraft(null);
      setBillable(true);
    }, 500);
    startTransition(() => router.refresh());
  }

  async function togglePause() {
    if (!running) return;
    const nowIso = new Date().toISOString();
    const next: PauseState = isPaused
      ? { pausedAt: null, pausedSeconds: pause.pausedSeconds + Math.floor((Date.now() - new Date(pause.pausedAt!).getTime()) / 1000) }
      : { pausedAt: nowIso, pausedSeconds: pause.pausedSeconds };
    setPauseOverride({ ...next, id: running.id, basePausedAt: running.pausedAt });
    const res = await setTimerPausedAction(!isPaused);
    if (!res.ok) {
      setPauseOverride(null);
      return toast.error(res.error);
    }
    startTransition(() => router.refresh());
  }

  async function discard() {
    const res = await discardTimerAction();
    if (!res.ok) return toast.error(res.error);
    toast("Timer discarded");
    onOpenChange(false);
    setDraft(null);
    startTransition(() => router.refresh());
  }

  const isRunning = !!running;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        {isRunning ? (
          <div className="flex h-8 items-center rounded-md border border-line bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-full min-w-0 cursor-pointer items-center gap-2 rounded-l-md pl-2.5 pr-2 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              aria-label={`Timer ${isPaused ? "paused" : "running"} on ${running.projectName}. Open clock-out panel`}
              aria-keyshortcuts="T"
            >
              <span className="relative flex size-1.5 shrink-0">
                {!isPaused && <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />}
                <span className={cn("relative inline-flex size-1.5 rounded-full", isPaused ? "bg-fg-3" : "bg-accent")} />
              </span>
              <span className={cn("text-[13px] tabular-nums", isPaused ? "text-fg-3" : "text-white")}>{formatClock(elapsed)}</span>
              <span className="hidden max-w-36 truncate text-xs text-fg-3 sm:inline">{isPaused ? "Paused" : running.projectName}</span>
            </button>
            <span aria-hidden className="h-4 w-px bg-line" />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={togglePause}
              aria-label={isPaused ? "Resume timer" : "Pause timer"}
              aria-pressed={isPaused}
              className="size-8 rounded-none text-fg-2"
            >
              <span className="t-icon-swap" data-state={isPaused ? "b" : "a"}>
                <span className="t-icon flex" data-icon="a">
                  <Pause className="size-3.5 fill-current" />
                </span>
                <span className="t-icon flex" data-icon="b">
                  <Play className="size-3.5 fill-current" />
                </span>
              </span>
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setOpen(true)}
              aria-label="Clock out"
              className="size-8 rounded-l-none text-fg-2"
            >
              <Square className="size-3 fill-current" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen((o) => !o)}
            className="text-fg-2"
            aria-keyshortcuts="T"
          >
            <Play className="size-3.5 fill-current" />
            Start timer
            <kbd className="ml-1 hidden rounded border border-line px-1.5 text-[10px] leading-4 text-fg-3 sm:inline">T</kbd>
          </Button>
        )}
      </PopoverAnchor>

      <PopoverContent align="end" sideOffset={8} className="w-[min(92vw,400px)] rounded-xl border-white/[0.08] bg-popover p-0 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        {!isRunning ? (
          <form onSubmit={clockIn} className="space-y-4 p-4">
            <div>
              <p className="text-[15px] font-semibold text-white">Start timer</p>
              <p className="text-xs text-fg-3">Keeps running if you close this tab.</p>
            </div>
            <FormField label="Project" error={error} errorKey={errorKey}>
              <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
            </FormField>
            <FormField label="Working on" optional>
              <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Homepage hero layout" maxLength={500} />
            </FormField>
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-fg-3">
                Press <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px]">T</kbd> anytime
              </span>
              <SubmitButton state={state} size="sm" pendingLabel="Starting…" successLabel="Running">
                <Play className="size-3.5 fill-current" /> Start timer
              </SubmitButton>
            </div>
          </form>
        ) : (
          <form onSubmit={clockOut} className="t-panel-slide space-y-4 p-4" data-open={open} style={{ ["--panel-translate-y" as string]: "12px" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-white">What did you work on?</p>
                <p className="truncate text-xs text-fg-3">
                  {running.projectName} · {running.clientName}
                </p>
              </div>
              <span className={cn("rounded-md bg-white/[0.06] px-2 py-0.5 text-[13px] tabular-nums", isPaused ? "text-fg-3" : "text-white")}>
                {isPaused ? `Paused · ${formatClock(elapsed)}` : formatClock(elapsed)}
              </span>
            </div>
            <FormField label="Description" error={error} errorKey={errorKey} hint="Your client sees this in their portal.">
              <TextArea
                ref={descRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Built the contact form, fixed mobile nav spacing…"
                rows={3}
                maxLength={2000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
                }}
              />
            </FormField>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="timer-billable" className="text-sm font-normal text-white">
                  Billable
                </Label>
                <p className="mt-0.5 text-xs leading-5 text-fg-3">{billable ? "Counts toward the next invoice." : "Shown to the client as “No charge”."}</p>
              </div>
              <Switch id="timer-billable" checked={billable} onCheckedChange={setBillable} />
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={discard} className="text-fg-3 hover:text-danger">
                <Trash2 /> Discard
              </Button>
              <SubmitButton state={state} size="sm" pendingLabel="Saving…" successLabel="Saved">
                <Square className="size-3 fill-current" /> Clock out
              </SubmitButton>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
