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
    <li className="group flex flex-col overflow-hidden rounded-2xl border bg-background/40 transition-all duration-300 hover:-translate-y-0.5">
      <ReferencePreview reference={reference}>
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
                  onClick={() => setFeedbackOpen(true)}
                  aria-label={reference.responseNote ? "Edit your feedback" : "Give feedback"}
                  aria-haspopup="dialog"
                  className={cn("size-11 sm:size-8", reference.responseNote ? "text-accent" : "text-white/50 hover:text-accent")}
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
        <div className="p-4">
          <p className="line-clamp-3 border-l-2 border-accent/30 pl-2.5 text-xs leading-5 whitespace-pre-wrap text-white/55">{reference.responseNote}</p>
        </div>
      )}

      <ReferenceFeedbackDialog reference={reference} open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </li>
  );
}
