"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FileText, ImageIcon, RotateCw, TriangleAlert, UploadCloud, Video, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { getUploadTargetAction } from "@/app/portal/_actions";
import { EmptyState } from "@/components/shared/EmptyState";
import { FieldSelect, FieldSelectItem } from "@/components/shared/FieldSelect";
import { SuccessCheck } from "@/components/shared/SuccessCheck";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { UploadKind } from "@/lib/db/schema";
import { PROJECT_STATUS } from "@/lib/status";
import { UPLOAD_KINDS, checkFile, formatBytes } from "@/lib/upload/kinds";
import { UploadError, isAbortError, uploadFile, type UploadTarget } from "@/lib/upload/uploader";
import { cn } from "@/lib/utils";

export type UploadProject = { id: string; name: string; status: string };

type ItemStatus = "queued" | "uploading" | "done" | "failed";
type QueueItem = {
  id: string;
  file: File;
  savedAs?: string;
  projectId: string;
  kind: UploadKind;
  status: ItemStatus;
  loaded: number;
  error?: string;
};

type Notice = { rejected: string[]; folders: number };

const CONCURRENCY = 2;
const KIND_ICONS: Record<UploadKind, LucideIcon> = { pictures: ImageIcon, videos: Video, files: FileText };
const KIND_LABEL = Object.fromEntries(UPLOAD_KINDS.map((k) => [k.value, k.label])) as Record<UploadKind, string>;

export function UploadDropbox({
  projects,
  initialProjectId,
  onUploaded,
}: {
  projects: UploadProject[];
  initialProjectId?: string;
  /** Fires once per file that lands in storage, so the folder browser can refresh that folder. */
  onUploaded?: (projectId: string, kind: UploadKind) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState<string | null>(() =>
    projects.length === 1 ? projects[0]!.id : (projects.find((p) => p.id === initialProjectId)?.id ?? null),
  );
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const dragDepth = useRef(0);
  const started = useRef(new Set<string>());
  const controllers = useRef(new Map<string, AbortController>());
  const targets = useRef(new Map<string, Promise<UploadTarget & { expiresAt: string }>>());
  const lastProgress = useRef(new Map<string, number>());
  const batchDone = useRef(0);

  const ready = Boolean(projectId);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Project";

  // Keep ?project= in the URL without a server round trip.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (projectId && projects.length > 1) params.set("project", projectId);
    else params.delete("project");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [projectId, projects.length]);

  const patch = useCallback((id: string, update: Partial<QueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...update } : it)));
  }, []);

  /** Cached upload target per (project, kind). `staleUrl` = a URL that just returned 404. */
  const getTarget = useCallback(async (pid: string, k: UploadKind, staleUrl?: string): Promise<UploadTarget> => {
    const key = `${pid}:${k}`;
    const cached = targets.current.get(key);
    if (cached) {
      if (!staleUrl) return cached;
      const current = await cached.catch(() => null);
      const latest = targets.current.get(key);
      // Another upload already replaced the dead link — reuse it instead of rotating again.
      if (latest && (latest !== cached || (current && current.uploadUrl !== staleUrl))) return latest;
    }
    const forget = () => {
      if (targets.current.get(key) === request) targets.current.delete(key);
    };
    const staleHash = staleUrl ? (new URL(staleUrl).searchParams.get("hash") ?? undefined) : undefined;
    const request = getUploadTargetAction({ projectId: pid, kind: k, staleHash }).then((res) => {
      if (!res.ok) throw new UploadError(res.error, 0);
      // Re-mint well before the link expires if the page stays open for days.
      setTimeout(forget, Math.max(0, Date.parse(res.data.expiresAt) - Date.now() - 3_600_000));
      return res.data;
    });
    request.catch(forget);
    targets.current.set(key, request);
    return request;
  }, []);

  const start = useCallback(
    async (item: QueueItem) => {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      patch(item.id, { status: "uploading", loaded: 0, error: undefined });
      try {
        const target = await getTarget(item.projectId, item.kind);
        const { name } = await uploadFile({
          file: item.file,
          target,
          signal: controller.signal,
          refreshTarget: (stale) => getTarget(item.projectId, item.kind, stale.uploadUrl),
          onProgress: (loaded) => {
            const now = performance.now();
            if (now - (lastProgress.current.get(item.id) ?? 0) < 100 && loaded < item.file.size) return;
            lastProgress.current.set(item.id, now);
            patch(item.id, { loaded });
          },
        });
        batchDone.current++;
        patch(item.id, { status: "done", loaded: item.file.size, savedAs: name });
        onUploaded?.(item.projectId, item.kind);
      } catch (err) {
        if (isAbortError(err)) return;
        patch(item.id, { status: "failed", error: err instanceof Error ? err.message : "Upload failed." });
      } finally {
        controllers.current.delete(item.id);
        started.current.delete(item.id);
        lastProgress.current.delete(item.id);
      }
    },
    [getTarget, patch, onUploaded],
  );

  // Scheduler: run up to CONCURRENCY uploads; each item keeps the project/kind it was dropped with.
  useEffect(() => {
    let slots = CONCURRENCY - items.filter((it) => it.status === "uploading").length;
    for (const it of items) {
      if (slots <= 0) break;
      if (it.status !== "queued" || started.current.has(it.id)) continue;
      started.current.add(it.id);
      slots--;
      void start(it);
    }
  }, [items, start]);

  const busy = items.some((it) => it.status === "queued" || it.status === "uploading");

  useEffect(() => {
    if (busy || batchDone.current === 0) return;
    const n = batchDone.current;
    batchDone.current = 0;
    toast.success(`${n} ${n === 1 ? "file" : "files"} uploaded`);
  }, [busy]);

  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((c) => c.abort());
  }, []);

  /** Sorts each file into pictures/videos/files by type — no manual folder choice needed. */
  function addFiles(files: File[], folders = 0) {
    if (!projectId) {
      setShaking(true);
      return;
    }
    const rejected: string[] = [];
    const accepted: QueueItem[] = [];
    for (const file of files) {
      const check = checkFile(file);
      if (check.ok) accepted.push({ id: crypto.randomUUID(), file, projectId, kind: check.kind, status: "queued", loaded: 0 });
      else rejected.push(`${file.name} (${check.reason === "blocked" ? "not allowed" : "over 5 GB"})`);
    }
    setNotice(rejected.length || folders ? { rejected, folders } : null);
    if (accepted.length) setItems((prev) => [...prev, ...accepted]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files: File[] = [];
    let folders = 0;
    const entries = Array.from(e.dataTransfer.items ?? []);
    if (entries.length) {
      for (const entry of entries) {
        if (entry.kind !== "file") continue;
        if (entry.webkitGetAsEntry?.()?.isDirectory) {
          folders++;
          continue;
        }
        const file = entry.getAsFile();
        if (file) files.push(file);
      }
    } else {
      files.push(...Array.from(e.dataTransfer.files));
    }
    addFiles(files, folders);
  }

  function cancel(id: string) {
    controllers.current.get(id)?.abort();
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function retry(id: string) {
    patch(id, { status: "queued", loaded: 0, error: undefined });
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          compact
          title="No active projects yet"
          description="Once a project is set up, you can send pictures, videos, and files for it here."
        />
      </div>
    );
  }

  const doneCount = items.filter((it) => it.status === "done").length;

  return (
    <section aria-label="Upload files" className="space-y-3">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">Upload</h2>
        {projects.length === 1 ? (
          <p className="text-[13px] text-fg-3">
            To <span className="text-white">{projects[0]!.name}</span>
          </p>
        ) : (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="shrink-0 text-[13px] text-fg-3">To</span>
            <FieldSelect label="Project" value={projectId ?? undefined} onValueChange={setProjectId} placeholder="Choose a project" className="sm:w-64">
              {projects.map((p) => (
                <FieldSelectItem key={p.id} value={p.id}>
                  {p.name}
                  <span className="ml-2 text-xs text-fg-3">{PROJECT_STATUS[p.status]?.label ?? p.status}</span>
                </FieldSelectItem>
              ))}
            </FieldSelect>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        disabled={!ready}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-disabled={!ready}
        aria-describedby={`${inputId}-hint`}
        onClick={() => (ready ? inputRef.current?.click() : setShaking(true))}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          if (ready) inputRef.current?.click();
          else setShaking(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current++;
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = ready ? "copy" : "none";
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={onDrop}
        onAnimationEnd={() => setShaking(false)}
        className={cn(
          "t-input flex min-h-[88px] cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed px-5 py-5 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none",
          shaking && "is-shaking",
          !ready && "cursor-not-allowed border-white/[0.08]",
          ready && !dragging && "border-white/[0.12] bg-surface hover:border-white/20 hover:bg-surface-2",
          ready && dragging && "border-accent/40 bg-accent/[0.05]",
        )}
      >
        <UploadCloud className={cn("size-5 shrink-0", ready ? (dragging ? "text-accent" : "text-fg-2") : "text-fg-3")} aria-hidden />
        <div>
          {ready ? (
            <>
              <p className="text-[13px] text-white">
                Drop files here or <span className="underline underline-offset-4">browse</span>
              </p>
              <p id={`${inputId}-hint`} className="text-xs text-fg-3">
                Pictures, videos, and documents · up to 5 GB each
              </p>
            </>
          ) : (
            <>
              <p className="text-[13px] text-fg-2">Choose a project first</p>
              <p id={`${inputId}-hint`} className="text-xs text-fg-3">
                Then drop files here or tap to browse.
              </p>
            </>
          )}
        </div>
      </div>

      {notice && (
        <div className="space-y-1 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-fg-2" role="status">
          {notice.rejected.length > 0 && <p>Skipped: {notice.rejected.join(", ")}.</p>}
          {notice.folders > 0 && <p>Folders can&apos;t be uploaded directly. Open the folder and drop the files inside.</p>}
        </div>
      )}

      {items.length > 0 && (
        <div aria-label="Uploads" className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex min-h-10 items-center justify-between gap-3 border-b border-line px-4">
            <p className="text-xs text-fg-2" aria-live="polite">
              {doneCount} of {items.length} uploaded
            </p>
            {doneCount > 0 && (
              <Button variant="ghost" size="sm" className="-mr-2 h-7" onClick={() => setItems((prev) => prev.filter((it) => it.status !== "done"))}>
                Clear finished
              </Button>
            )}
          </div>
          <ul className="divide-y divide-line">
            {items.map((it) => {
              const Icon = KIND_ICONS[it.kind];
              const pct = it.file.size ? Math.round((it.loaded / it.file.size) * 100) : it.status === "done" ? 100 : 0;
              const renamed = it.savedAs && it.savedAs !== it.file.name;
              return (
                <li key={it.id} className="relative flex items-center gap-3 px-4 py-2.5">
                  <Icon className="size-4 shrink-0 text-fg-3" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[13px] text-white" title={it.file.name}>
                        {it.file.name}
                      </p>
                      <span className="shrink-0 text-xs tabular-nums text-fg-3">{formatBytes(it.file.size)}</span>
                    </div>
                    <p className={cn("truncate text-xs", it.status === "failed" ? "text-danger" : "text-fg-3")}>
                      {it.status === "queued" && "Waiting…"}
                      {it.status === "uploading" && `Uploading ${pct}% · ${projectName(it.projectId)} › ${KIND_LABEL[it.kind]}`}
                      {it.status === "done" && (renamed ? `Uploaded as “${it.savedAs}”` : `Uploaded to ${projectName(it.projectId)} › ${KIND_LABEL[it.kind]}`)}
                      {it.status === "failed" && (
                        <>
                          <TriangleAlert className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
                          {it.error}
                        </>
                      )}
                    </p>
                  </div>
                  {it.status === "done" ? (
                    <SuccessCheck className="size-5 shrink-0 text-success" />
                  ) : it.status === "failed" ? (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Retry ${it.file.name}`} onClick={() => retry(it.id)} className="size-10 sm:size-8">
                        <RotateCw className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${it.file.name}`} onClick={() => cancel(it.id)} className="size-10 sm:size-8">
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="icon-sm" aria-label={`Cancel ${it.file.name}`} onClick={() => cancel(it.id)} className="size-10 shrink-0 sm:size-8">
                      <X className="size-4" />
                    </Button>
                  )}
                  {(it.status === "uploading" || it.status === "queued") && (
                    <Progress
                      value={pct}
                      className="absolute inset-x-0 bottom-0 h-0.5 rounded-none bg-transparent"
                      aria-label={`${it.file.name} upload progress`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
