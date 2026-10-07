"use client";

import { Link2, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";

import { deleteReferenceAction } from "@/app/admin/_actions/projects";
import { ActionButton } from "@/components/shared/ActionButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ReferencePreview } from "@/components/shared/ReferencePreview";
import { statusBadgeFor } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { REFERENCE_STATUS } from "@/lib/status";
import type { ProjectReference } from "@/lib/db/schema";

export function ReferencesPanel({ projectId, references }: { projectId: string; references: ProjectReference[] }) {
  if (references.length === 0) return <EmptyState compact icon={Link2} title="No references yet" />;

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {references.map((r) => (
        <li key={r.id} className="group flex flex-col overflow-hidden rounded-2xl border bg-background/40">
          <ReferencePreview reference={r}>
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              {statusBadgeFor(REFERENCE_STATUS, r.status, {
                icon: r.status === "approved" ? ThumbsUp : r.status === "declined" ? ThumbsDown : undefined,
                className: "bg-background/85 backdrop-blur-sm",
              })}
              <ActionButton
                variant="ghost"
                size="icon-sm"
                aria-label="Delete reference"
                className="rounded-full bg-background/85 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
                action={deleteReferenceAction.bind(null, projectId, r.id)}
                confirm={{ title: "Delete this reference?", description: "It will disappear from the client's portal.", confirmLabel: "Delete", destructive: true }}
              >
                <Trash2 />
              </ActionButton>
            </div>
          </ReferencePreview>

          <div className="flex flex-1 flex-col gap-2 p-4">
            {r.responseNote && (
              <p className="line-clamp-3 border-l-2 border-accent/30 pl-2.5 text-xs leading-5 whitespace-pre-wrap text-white/70">
                <span className="text-white/40">Client says: </span>
                {r.responseNote}
              </p>
            )}
            <p className="mt-auto text-[11px] text-white/30">
              Sent {formatDateTime(r.createdAt)}
              {r.respondedAt ? ` · responded ${formatDateTime(r.respondedAt)}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
