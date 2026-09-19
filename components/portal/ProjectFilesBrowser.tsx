"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, FileText, FolderOpen, Image as ImageIcon, Pencil, Trash2, Video, X } from "lucide-react";
import { toast } from "sonner";

import { deleteFileAction, listFolderFilesAction, listProjectFoldersAction, renameFileAction, type StorageFile } from "@/app/portal/_actions";
import { Disclosure } from "@/components/shared/Disclosure";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fieldInputClass } from "@/components/shared/FormField";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { formatBytes } from "@/lib/upload/kinds";
import { cn } from "@/lib/utils";
import type { UploadedSignal } from "@/components/portal/FilesWorkspace";
import type { UploadProject } from "@/components/portal/UploadDropbox";

/** Folder names are whatever exists in storage, so the icon is picked by name, with a neutral default. */
function FolderIcon({ name, className }: { name: string; className?: string }) {
  const n = name.toLowerCase();
  if (n.includes("pic") || n.includes("photo") || n.includes("image") || n.includes("logo")) return <ImageIcon className={className} aria-hidden />;
  if (n.includes("video") || n.includes("clip")) return <Video className={className} aria-hidden />;
  return <FolderOpen className={className} aria-hidden />;
}

function FileIcon({ type, className }: { type: string; className?: string }) {
  if (type.startsWith("image/")) return <ImageIcon className={className} aria-hidden />;
  if (type.startsWith("video/")) return <Video className={className} aria-hidden />;
  return <FileText className={className} aria-hidden />;
}

/** "report.pdf" -> ["report", ".pdf"]; a dotfile or extensionless name keeps an empty extension. */
function splitName(name: string): [string, string] {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
}

function FileRow({
  projectId,
  folder,
  file,
  onRenamed,
  onDeleted,
}: {
  projectId: string;
  folder: string;
  file: StorageFile;
  onRenamed: (oldName: string, newName: string) => void;
  onDeleted: (name: string) => void;
}) {
  const [base, ext] = splitName(file.name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(base);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    const next = draft.trim();
    if (!next || next + ext === file.name) return setEditing(false);
    setBusy(true);
    const res = await renameFileAction(projectId, folder, file.name, next + ext);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    onRenamed(file.name, res.data);
    setDraft(splitName(res.data)[0]);
    setEditing(false);
  }

  async function remove() {
    setBusy(true);
    const res = await deleteFileAction(projectId, folder, file.name);
    setBusy(false);
    setConfirming(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    onDeleted(file.name);
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 px-3 py-0.5 text-xs">
        <FileIcon type={file.type} className="size-3.5 shrink-0 text-white/25" />
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <input
            autoFocus
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") {
                setDraft(base);
                setEditing(false);
              }
            }}
            aria-label={"Rename " + file.name}
            className={cn(fieldInputClass, "h-8 min-w-0 flex-1 px-2 text-xs")}
          />
          {ext && <span className="shrink-0 text-white/35">{ext}</span>}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Save name" disabled={busy} onClick={save} className="size-7 hover:text-success">
          <Check className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cancel rename"
          disabled={busy}
          onClick={() => {
            setDraft(base);
            setEditing(false);
          }}
          className="size-7"
        >
          <X className="size-3.5" />
        </Button>
      </li>
    );
  }

  return (
    <li className="group/file flex items-center gap-2.5 rounded-lg px-3 py-0.5 text-xs transition-colors hover:bg-white/[0.03]">
      <FileIcon type={file.type} className="size-3.5 shrink-0 text-white/25" />
      <span className="min-w-0 flex-1 truncate text-white/80" title={file.name}>
        {file.name}
      </span>
      <span className="shrink-0 tabular-nums text-white/35">{formatBytes(file.size)}</span>
      <span className="hidden shrink-0 text-white/30 sm:inline">{formatDate(file.modified, "MMM d")}</span>
      <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within/file:opacity-100 group-hover/file:opacity-100">
        <Button variant="ghost" size="icon-sm" aria-label={"Rename " + file.name} onClick={() => setEditing(true)} className="size-7 hover:text-accent">
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={"Delete " + file.name} onClick={() => setConfirming(true)} className="size-7 hover:text-danger">
          <Trash2 className="size-3.5" />
        </Button>
      </span>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="clay rounded-2xl border-white/10 bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this file?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-white/60">
              {file.name} will be removed from storage. You can upload it again afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  void remove();
                }}
              >
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function FolderRow({ projectId, folder, revision }: { projectId: string; folder: string; revision: number }) {
  const [files, setFiles] = useState<StorageFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Starts open when it mounts because an upload just landed in it (the folder list was refetched).
  const [open, setOpen] = useState(revision > 0);
  const request = useRef(0);

  const fetchFiles = useCallback(() => {
    // Overlapping refreshes are fine as long as only the newest response is kept.
    const mine = ++request.current;
    void listFolderFilesAction(projectId, folder).then((res) => {
      if (mine !== request.current) return;
      setLoading(false);
      if (res.ok) {
        setFiles(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  }, [projectId, folder]);

  // Contents are fetched the first time the folder is expanded, not up front.
  function load() {
    if (files || request.current > 0) return;
    setLoading(true);
    fetchFiles();
  }

  // An upload that landed here bumps the revision: expand during render, refetch in the effect.
  const [seenRevision, setSeenRevision] = useState(revision);
  if (revision !== seenRevision) {
    setSeenRevision(revision);
    setOpen(true);
  }
  useEffect(() => {
    // Refetches without the skeleton, so the list stays visible while it updates.
    if (revision > 0) fetchFiles();
  }, [revision, fetchFiles]);

  return (
    <Disclosure
      open={open}
      onOpenChange={setOpen}
      className="border-b border-white/5 last:border-0"
      title={
        <span className="flex items-center gap-2.5">
          <FolderIcon name={folder} className="size-4 shrink-0 text-white/40" />
          <span className="truncate capitalize">{folder}</span>
          {files && <span className="text-xs text-white/35">{files.length}</span>}
        </span>
      }
      onOpen={load}
    >
      <div className="pb-3 pl-4">
        {error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : loading || !files ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3 bg-white/5" />
            <Skeleton className="h-4 w-1/2 bg-white/5" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-xs text-white/35">Nothing here yet.</p>
        ) : (
          <ul className="space-y-1">
            {files.map((f) => (
              <FileRow
                key={f.name}
                projectId={projectId}
                folder={folder}
                file={f}
                onRenamed={(oldName, newName) => setFiles((prev) => (prev ?? []).map((x) => (x.name === oldName ? { ...x, name: newName } : x)))}
                onDeleted={(name) => setFiles((prev) => (prev ?? []).filter((x) => x.name !== name))}
              />
            ))}
          </ul>
        )}
      </div>
    </Disclosure>
  );
}

export function ProjectFilesBrowser({ projects, uploaded }: { projects: UploadProject[]; uploaded?: UploadedSignal | null }) {
  const params = useSearchParams();
  // Mirrors the dropbox's ?project= so both halves of the page stay on the same project.
  const projectId = projects.find((p) => p.id === params.get("project"))?.id ?? projects[0]?.id;
  const [folders, setFolders] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  // Bumped per folder name; each bump tells that folder to refetch.
  const [revisions, setRevisions] = useState<Record<string, number>>({});
  // Reset during render when the project changes, so the effect only ever sets state from its response.
  const [loadedFor, setLoadedFor] = useState(projectId);
  if (projectId !== loadedFor) {
    setLoadedFor(projectId);
    setFolders(null);
    setError(null);
    setRevisions({});
  }

  // The kind folder is the folder name, so a finished upload maps straight onto one row.
  const [seenSeq, setSeenSeq] = useState(uploaded?.seq ?? 0);
  if (uploaded && uploaded.seq !== seenSeq) {
    setSeenSeq(uploaded.seq);
    if (uploaded.projectId === projectId) {
      setRevisions((prev) => ({ ...prev, [uploaded.kind]: (prev[uploaded.kind] ?? 0) + 1 }));
      // First upload of that kind: the folder was created server-side after this list was fetched.
      if (folders && !folders.includes(uploaded.kind)) setReload((n) => n + 1);
    }
  }

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void listProjectFoldersAction(projectId).then((res) => {
      if (cancelled) return;
      if (res.ok) setFolders(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, reload]);

  if (!projectId) return null;
  const projectName = projects.find((p) => p.id === projectId)?.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your files{projects.length > 1 && projectName ? ` · ${projectName}` : ""}</CardTitle>
      </CardHeader>
      <CardContent className="py-1">
        {error ? (
          <p className="py-3 text-sm text-danger">{error}</p>
        ) : !folders ? (
          <div className="space-y-3 py-3">
            <Skeleton className="h-5 w-40 bg-white/5" />
            <Skeleton className="h-5 w-32 bg-white/5" />
          </div>
        ) : folders.length === 0 ? (
          <EmptyState compact icon={FolderOpen} title="No folders yet" description="They'll appear here once you upload something." />
        ) : (
          folders.map((f) => <FolderRow key={f} projectId={projectId} folder={f} revision={revisions[f] ?? 0} />)
        )}
      </CardContent>
    </Card>
  );
}
