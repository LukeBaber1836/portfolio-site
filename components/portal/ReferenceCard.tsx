"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link2, Pencil, StickyNote, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { respondToReferenceAction, saveReferenceNoteAction } from "@/app/portal/_actions";
import { TextArea } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProjectReference } from "@/lib/db/schema";
import { hostOf } from "@/lib/references/preview";
import { cn } from "@/lib/utils";

/** The picture: stored screenshot when we have one, otherwise a favicon/host tile so the grid stays uniform. */
function Thumbnail({ reference, broken, onError }: { reference: ProjectReference; broken: boolean; onError: () => void }) {
  if (reference.screenshotUrl && !broken) {
    return (
      <img
        src={reference.screenshotUrl}
        alt=""
        loading="lazy"
        onError={onError}
        className="size-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
    );
  }
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/[0.07] to-transparent">
      {reference.kind === "link" ? (
        reference.faviconUrl ? (
          <img src={reference.faviconUrl} alt="" loading="lazy" className="size-9 rounded-lg" />
        ) : (
          <Link2 className="size-8 text-white/20" aria-hidden />
        )
      ) : (
        <StickyNote className="size-8 text-white/20" aria-hidden />
      )}
      {reference.url && <span className="max-w-[85%] truncate text-xs text-white/30">{hostOf(reference.url)}</span>}
    </div>
  );
}

export function ReferenceCard({ reference }: { reference: ProjectReference }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notePending, startNoteTransition] = useTransition();
  const [editingNote, setEditingNote] = useState(false);
  const [draft, setDraft] = useState(reference.responseNote ?? "");
  const [imgBroken, setImgBroken] = useState(false);

  function respond(status: "approved" | "declined") {
    if (reference.status === status) return;
    startTransition(async () => {
      const res = await respondToReferenceAction(reference.id, status);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  }

  function saveNote() {
    startNoteTransition(async () => {
      const res = await saveReferenceNoteAction(reference.id, draft);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEditingNote(false);
      router.refresh();
    });
  }

  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border bg-background/40 transition-all duration-300 hover:-translate-y-0.5">
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-white/5">
        {reference.url ? (
          <a href={reference.url} target="_blank" rel="noopener noreferrer" aria-label={reference.title} className="absolute inset-0">
            <Thumbnail reference={reference} broken={imgBroken} onError={() => setImgBroken(true)} />
          </a>
        ) : (
          <Thumbnail reference={reference} broken={imgBroken} onError={() => setImgBroken(true)} />
        )}
        {/* Scrim spans the whole picture so the fade is gradual, not a hard-edged band behind the title. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background to-transparent" />

        <TooltipProvider delayDuration={2000}>
          <div className="clay absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-background/85 p-1 backdrop-blur-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending || reference.status === "approved"}
                  onClick={() => respond("approved")}
                  aria-label="I like it"
                  aria-pressed={reference.status === "approved"}
                  className={cn(
                    "size-11 disabled:opacity-100 sm:size-8",
                    reference.status === "approved" ? "bg-success/10 text-success" : "text-white/50 hover:text-success",
                  )}
                >
                  <ThumbsUp className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>I like it</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending || reference.status === "declined"}
                  onClick={() => respond("declined")}
                  aria-label="Not for me"
                  aria-pressed={reference.status === "declined"}
                  className={cn(
                    "size-11 disabled:opacity-100 sm:size-8",
                    reference.status === "declined" ? "bg-danger/10 text-danger" : "text-white/50 hover:text-danger",
                  )}
                >
                  <ThumbsDown className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Not for me</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditingNote((v) => !v)}
                  aria-label={reference.responseNote ? "Edit your note" : "Add your thoughts"}
                  aria-pressed={editingNote}
                  className={cn("size-11 sm:size-8", reference.responseNote ? "text-accent" : "text-white/50 hover:text-accent")}
                >
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{reference.responseNote ? "Edit your note" : "Add your thoughts"}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div className="relative z-10 -mt-10 flex flex-1 flex-col gap-1.5 p-4 pt-10">
        {reference.url ? (
          <a href={reference.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-medium text-white hover:text-accent">
            {reference.title}
          </a>
        ) : (
          <p className="line-clamp-2 font-medium text-white">{reference.title}</p>
        )}
        {reference.note && <p className="line-clamp-2 text-xs leading-5 text-white/45">{reference.note}</p>}

        {editingNote ? (
          <div className="mt-1 space-y-2">
            <TextArea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What do you think? Anything you'd change?"
              maxLength={2000}
              className="min-h-20 text-sm"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={notePending} onClick={saveNote}>
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={notePending}
                onClick={() => {
                  setDraft(reference.responseNote ?? "");
                  setEditingNote(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          reference.responseNote && (
            <p className="mt-1 line-clamp-3 border-l-2 border-accent/30 pl-2.5 text-xs leading-5 whitespace-pre-wrap text-white/55">{reference.responseNote}</p>
          )
        )}
      </div>
    </li>
  );
}
