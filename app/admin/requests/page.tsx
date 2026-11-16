import Link from "next/link";

import { RequestStatusControl } from "@/components/admin/RequestStatusControl";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SlidingTabs } from "@/components/shared/SlidingTabs";
import { statusBadgeFor } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { listRequests } from "@/lib/dal/admin/dashboard";
import { formatDateTime, formatRelative } from "@/lib/format";
import { REQUEST_STATUS, serviceLabel } from "@/lib/status";

export const metadata = { title: "Requests" };

const OPEN = ["new", "in_review"];

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: raw } = await searchParams;
  const view = raw === "closed" || raw === "all" ? raw : "open";
  const all = await listRequests();
  const openCount = all.filter((r) => OPEN.includes(r.request.status)).length;
  const rows = all.filter((r) => (view === "all" ? true : view === "open" ? OPEN.includes(r.request.status) : !OPEN.includes(r.request.status)));

  return (
    <>
      <PageHeader title="Requests" meta={[`${openCount} open`]} />

      <div className="mb-3">
        <SlidingTabs
          size="sm"
          value={view}
          items={[
            { value: "open", label: "Open", href: "/admin/requests" },
            { value: "closed", label: "Closed", href: "/admin/requests?view=closed" },
            { value: "all", label: "All", href: "/admin/requests?view=all" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {rows.length === 0 ? (
          <EmptyState compact title={view === "open" ? "No open requests" : "No requests"} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(({ request: r, clientName, clientId, fromName, fromEmail }) => (
              <li key={r.id} className="px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-white">{r.title}</p>
                      {statusBadgeFor(REQUEST_STATUS, r.status)}
                    </div>
                    <p className="mt-0.5 text-xs text-fg-3">
                      <Link href={`/admin/clients/${clientId}`} className="hover:text-white">
                        {clientName}
                      </Link>
                      {fromName && ` · ${fromName}`} · {serviceLabel(r.serviceType)} ·{" "}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <time dateTime={r.createdAt.toISOString()} className="cursor-default">
                            {formatRelative(r.createdAt)}
                          </time>
                        </TooltipTrigger>
                        <TooltipContent>{formatDateTime(r.createdAt)}</TooltipContent>
                      </Tooltip>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {fromEmail && (
                      <Button asChild variant="ghost" size="sm">
                        <a href={`mailto:${fromEmail}?subject=${encodeURIComponent(`Re: ${r.title}`)}`}>Reply</a>
                      </Button>
                    )}
                    {r.status !== "accepted" && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/projects?new=1&client=${clientId}`}>Create project</Link>
                      </Button>
                    )}
                    <RequestStatusControl id={r.id} status={r.status} />
                  </div>
                </div>
                <p className="mt-3 max-w-3xl whitespace-pre-wrap text-[13px] leading-6 text-fg-2">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
