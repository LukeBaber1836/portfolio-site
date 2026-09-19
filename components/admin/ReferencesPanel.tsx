"use client";

import { Link2, StickyNote, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";

import { deleteReferenceAction } from "@/app/admin/_actions/projects";
import { ActionButton } from "@/components/shared/ActionButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { statusBadgeFor } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { REFERENCE_STATUS } from "@/lib/status";
import type { ProjectReference } from "@/lib/db/schema";

export function ReferencesPanel({ projectId, references }: { projectId: string; references: ProjectReference[] }) {

  return (
    <div>
      {references.length === 0 ? (
        <EmptyState compact icon={Link2} title="No references yet" />
      ) : (
        <ul className="divide-y divide-white/5">
          {references.map((r) => (
            <li key={r.id} className="group flex items-start gap-3 py-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                {r.faviconUrl ? (
                  <img src={r.faviconUrl} alt="" width={16} height={16} className="size-4" loading="lazy" />
                ) : r.kind === "link" ? (
                  <Link2 className="size-3.5 text-white/40" />
                ) : (
                  <StickyNote className="size-3.5 text-white/40" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium text-white hover:text-accent">
                      {r.title}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-white">{r.title}</p>
                  )}
                  {statusBadgeFor(REFERENCE_STATUS, r.status, { icon: r.status === "approved" ? ThumbsUp : r.status === "declined" ? ThumbsDown : undefined })}
                </div>
                {r.note && <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-white/50">{r.note}</p>}
                {r.responseNote && (
                  <p className="mt-1 whitespace-pre-wrap rounded-lg border border-accent/15 bg-accent/5 px-2.5 py-1.5 text-xs leading-5 text-white/70">
                    <span className="text-white/40">Client says: </span>
                    {r.responseNote}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-white/30">
                  Sent {formatDateTime(r.createdAt)}
                  {r.respondedAt ? ` · responded ${formatDateTime(r.respondedAt)}` : ""}
                </p>
              </div>
              <ActionButton
                variant="ghost"
                size="icon-sm"
                aria-label="Delete reference"
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
                action={deleteReferenceAction.bind(null, projectId, r.id)}
                confirm={{ title: "Delete this reference?", description: "It will disappear from the client's portal.", confirmLabel: "Delete", destructive: true }}
              >
                <Trash2 />
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
