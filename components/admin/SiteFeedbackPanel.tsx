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

/** Comments clients pinned on their site through the review toolbar, grouped by page. */
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

  // Items arrive sorted by page, then creation — group them and number like the pins on the site.
  const pages = new Map<string, SiteFeedbackItem[]>();
  for (const c of items) pages.set(c.pagePath, [...(pages.get(c.pagePath) ?? []), c]);

  return (
    <div className="space-y-6">
      {[...pages].map(([path, comments]) => {
        const open = comments.filter((c) => c.status === "open").length;
        return (
          <section key={path} aria-label={`Comments on ${path}`}>
            <header className="mb-1 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <a
                href={`/admin/projects/${projectId}/review?path=${encodeURIComponent(path)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open this page in review mode"
                className="group inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-white hover:text-accent"
              >
                <span className="truncate">{path}</span>
                <ExternalLink className="size-3.5 shrink-0 text-white/30 group-hover:text-accent" />
              </a>
              <span className="shrink-0 text-xs tabular-nums text-white/40">
                {open > 0 ? <span className="text-accent">{open} open</span> : "all resolved"}
                {comments.length - open > 0 && open > 0 && ` · ${comments.length - open} resolved`}
              </span>
            </header>
            <ul className="divide-y divide-white/5">
              {comments.map((c, i) => (
                <li key={c.id} className={cn("group flex gap-3 py-3", c.status === "resolved" && "opacity-55")}>
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full rounded-bl-[4px] px-1.5 text-[11px] font-bold",
                      c.status === "resolved" ? "bg-white/15 text-white/60" : "bg-gradient-to-br from-gold-d1 via-gold-l1 to-gold-d2 text-background",
                    )}
                    aria-label={`Pin ${i + 1}`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center justify-between gap-3 text-xs text-white/40">
                      <span className="min-w-0 truncate">
                        {c.authorName}
                        {c.fromAdmin && " (you)"} · {formatDateTime(c.createdAt)} · {c.viewport}
                        {c.status === "resolved" && <span className="ml-1 text-success/80">· resolved</span>}
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
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
