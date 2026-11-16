"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { saveReferenceFeedbackAction } from "@/app/portal/_actions";
import { ReferenceFeedbackDialog } from "@/components/portal/ReferenceFeedbackDialog";
import { ReferencePreview } from "@/components/shared/ReferencePreview";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProjectReference } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function ReferenceCard({ reference }: { reference: ProjectReference }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  function respond(status: "approved" | "declined") {
    if (reference.status === status) return;
    startTransition(async () => {
      const res = await saveReferenceFeedbackAction({ id: reference.id, status });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  }

  return (
    <li className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <ReferencePreview reference={reference}>
        <TooltipProvider delayDuration={2000}>
          <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-md border border-white/[0.08] bg-popover/95 p-0.5">
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
                    reference.status === "approved" ? "bg-success/10 text-success" : "text-fg-2 hover:text-white",
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
                    reference.status === "declined" ? "bg-danger/10 text-danger" : "text-fg-2 hover:text-white",
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
                  onClick={() => setFeedbackOpen(true)}
                  aria-label={reference.responseNote ? "Edit your feedback" : "Give feedback"}
                  aria-haspopup="dialog"
                  className={cn("size-11 sm:size-8", reference.responseNote ? "text-white" : "text-fg-2 hover:text-white")}
                >
                  <Pencil className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{reference.responseNote ? "Edit your feedback" : "Give feedback"}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </ReferencePreview>

      {reference.responseNote && (
        <div className="border-t border-line px-3 py-2.5">
          <p className="line-clamp-3 text-xs leading-5 whitespace-pre-wrap text-fg-2">
            <span className="text-fg-3">You: </span>
            {reference.responseNote}
          </p>
        </div>
      )}

      <ReferenceFeedbackDialog reference={reference} open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </li>
  );
}
