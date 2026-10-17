import Link from "next/link";
import { Check, ExternalLink, MessageSquareDashed, RotateCcw, Trash2 } from "lucide-react";

import { deleteSiteCommentAction, setSiteCommentStatusAction } from "@/app/admin/_actions/projects";
import { ActionButton } from "@/components/shared/ActionButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SiteFeedbackItem = {
  id: string;
  authorName: string;
  fromAdmin: boolean;
  pagePath: string;
  viewport: string;
  bodyText: string;
  status: "open" | "resolved";
  createdAt: Date;
};

/** Comments clients pinned on their site through the review toolbar. */
export function SiteFeedbackPanel({ projectId, items, hasSite }: { projectId: string; items: SiteFeedbackItem[]; hasSite: boolean }) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={MessageSquareDashed}
        title="No site feedback yet"
        description={
          hasSite ? (
            <>
              Clients comment from the pencil on their project page. The site needs the review script —{" "}
              <Link href="/admin/settings#site-review" className="text-accent hover:underline">
                get the snippet
              </Link>
              .
            </>
          ) : (
            "Add a production or preview domain first — that's the site clients comment on."
          )
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {items.map((c) => (
        <li key={c.id} className={cn("group py-4", c.status === "resolved" && "opacity-55")}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs text-white/40">
            <span className="min-w-0 truncate">
              <span className="font-medium text-accent">{c.pagePath}</span> · {c.authorName}
              {c.fromAdmin && " (you)"} · {formatDateTime(c.createdAt)} · {c.viewport}
              {c.status === "resolved" && <span className="ml-2 text-success/80">· resolved</span>}
            </span>
            <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <a
                href={`/admin/projects/${projectId}/review?path=${encodeURIComponent(c.pagePath)}&focus=${c.id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open on site"
                title="Open on site"
                className="inline-flex size-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-accent"
              >
                <ExternalLink className="size-3.5" />
              </a>
              <ActionButton
                variant="ghost"
                size="icon-sm"
                aria-label={c.status === "resolved" ? "Reopen" : "Mark resolved"}
                title={c.status === "resolved" ? "Reopen" : "Mark resolved"}
                className="hover:text-success"
                action={setSiteCommentStatusAction.bind(null, projectId, c.id, c.status === "resolved" ? "open" : "resolved")}
              >
                {c.status === "resolved" ? <RotateCcw /> : <Check />}
              </ActionButton>
              <ActionButton
                variant="ghost"
                size="icon-sm"
                aria-label="Delete comment"
                className="hover:text-danger"
                action={deleteSiteCommentAction.bind(null, projectId, c.id)}
                confirm={{ title: "Delete this comment?", description: "It disappears from the site for the client too.", confirmLabel: "Delete", destructive: true }}
              >
                <Trash2 />
              </ActionButton>
            </span>
          </div>
          <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-white/85">{c.bodyText}</p>
        </li>
      ))}
    </ul>
  );
}
