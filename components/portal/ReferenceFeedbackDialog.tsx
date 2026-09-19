"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { saveReferenceFeedbackAction } from "@/app/portal/_actions";
import { TextArea } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ProjectReference } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type Vote = "approved" | "declined";

const VOTES: { value: Vote; label: string; icon: typeof ThumbsUp; active: string; hover: string }[] = [
  { value: "approved", label: "I like it", icon: ThumbsUp, active: "border-success/40 bg-success/10 text-success", hover: "hover:text-success" },
  { value: "declined", label: "Not for me", icon: ThumbsDown, active: "border-danger/40 bg-danger/10 text-danger", hover: "hover:text-danger" },
];

/** Mounted only while the dialog is open, so it starts from the saved values every time. */
function FeedbackForm({ reference, onDone }: { reference: ProjectReference; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const saved: Vote | null = reference.status === "pending" ? null : reference.status;
  const [vote, setVote] = useState<Vote | null>(saved);
  const [note, setNote] = useState(reference.responseNote ?? "");

  const changed = vote !== saved || note.trim() !== (reference.responseNote ?? "");

  function save() {
    startTransition(async () => {
      const res = await saveReferenceFeedbackAction({
        id: reference.id,
        // Only sent when picked; an untouched (still pending) vote is left alone.
        ...(vote ? { status: vote } : {}),
        note,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      onDone();
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Your reaction">
        {VOTES.map(({ value, label, icon: Icon, active, hover }) => (
          <button
            key={value}
            type="button"
            aria-pressed={vote === value}
            disabled={pending}
            onClick={() => setVote(value)}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none disabled:cursor-not-allowed",
              vote === value ? active : cn("border-white/10 bg-background text-white/60", hover),
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <TextArea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What do you think? Anything you'd change?"
        maxLength={2000}
        aria-label="Your feedback"
        className="min-h-28 text-sm"
      />
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={pending || !changed} onClick={save}>
          {pending ? "Saving…" : "Save feedback"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function ReferenceFeedbackDialog({
  reference,
  open,
  onOpenChange,
}: {
  reference: ProjectReference;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Your feedback</DialogTitle>
          <DialogDescription className="line-clamp-2 text-white/50">{reference.title}</DialogDescription>
        </DialogHeader>
        <FeedbackForm reference={reference} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
