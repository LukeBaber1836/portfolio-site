"use client";

import { ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";

import { deleteReferenceAction } from "@/app/admin/_actions/projects";
import { ActionButton } from "@/components/shared/ActionButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ReferencePreview } from "@/components/shared/ReferencePreview";
import { statusBadgeFor } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { REFERENCE_STATUS } from "@/lib/status";
import type { ProjectReference } from "@/lib/db/schema";

export function ReferencesPanel({ projectId, references }: { projectId: string; references: ProjectReference[] }) {
  if (references.length === 0)
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState compact title="No references yet" description="Send links or notes for the client to approve or decline." />
      </div>
    );

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {references.map((r) => (
        <li key={r.id} className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
          <ReferencePreview reference={r}>
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              {statusBadgeFor(REFERENCE_STATUS, r.status, {
                icon: r.status === "approved" ? ThumbsUp : r.status === "declined" ? ThumbsDown : undefined,
                className: "bg-background/90",
              })}
              <ActionButton
                variant="ghost"
                size="icon-sm"
                aria-label="Delete reference"
                className="size-7 bg-background/90 text-fg-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-background hover:text-danger"
                action={deleteReferenceAction.bind(null, projectId, r.id)}
                confirm={{ title: "Delete this reference?", description: "It will disappear from the client's portal.", confirmLabel: "Delete", destructive: true }}
              >
                <Trash2 />
              </ActionButton>
            </div>
          </ReferencePreview>

          <div className="flex flex-1 flex-col gap-2 px-3 py-2.5">
            {r.responseNote && (
              <p className="line-clamp-3 border-l-2 border-line-strong pl-2.5 text-xs leading-5 whitespace-pre-wrap text-fg-2">
                <span className="text-fg-3">Client: </span>
                {r.responseNote}
              </p>
            )}
            <p className="mt-auto text-xs text-fg-3">
              Sent {formatDateTime(r.createdAt)}
              {r.respondedAt ? ` · responded ${formatDateTime(r.respondedAt)}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
