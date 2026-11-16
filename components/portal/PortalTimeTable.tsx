import Link from "next/link";

import { StatusBadge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { TIME_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  projectId: string;
  projectName: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  description: string | null;
  billable: boolean;
  invoiceId: string | null;
  invoiceStatus: string | null;
};

function statusKey(e: Entry) {
  if (!e.billable) return "no_charge";
  if (!e.invoiceId) return "unbilled";
  return e.invoiceStatus === "paid" ? "paid" : "invoiced";
}

// Client-facing labels: "unbilled" reads better as "Not yet invoiced".
const CLIENT_LABELS: Record<string, string> = { unbilled: "Not yet invoiced" };

export function PortalTimeTable({ entries, showProject, maxHeightClass }: { entries: Entry[]; showProject?: boolean; maxHeightClass?: string }) {
  // With a height cap the table scrolls inside itself, so the header stays pinned (opaque, with its own divider).
  const head = maxHeightClass ? "sticky top-0 z-10 bg-surface shadow-[inset_0_-1px_0_var(--color-line)]" : undefined;
  return (
    <Table containerClassName={cn(maxHeightClass && "scrollbar-subtle overflow-y-auto", maxHeightClass)}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={head}>Date</TableHead>
          <TableHead className={head}>What I worked on</TableHead>
          <TableHead className={cn("text-right", head)}>Time</TableHead>
          <TableHead className={head}>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => {
          const key = statusKey(e);
          const def = TIME_STATUS[key]!;
          return (
            <TableRow key={e.id}>
              <TableCell className="py-2.5 align-top">
                <span className="block text-[13px] text-white">{formatDate(e.startedAt, "EEE, MMM d")}</span>
                <span className="block text-xs text-fg-3">
                  {formatTime(e.startedAt)}–{formatTime(e.endedAt)}
                </span>
              </TableCell>
              <TableCell className="max-w-lg py-2.5 whitespace-normal align-top">
                {showProject && (
                  <Link href={`/portal/projects/${e.projectId}`} className="block text-xs text-fg-3 hover:text-white">
                    {e.projectName}
                  </Link>
                )}
                <span className="block text-[13px] leading-5 text-fg-2">{e.description}</span>
              </TableCell>
              <TableCell className="text-right align-top text-[13px] tabular-nums text-white">{formatDuration(e.durationSeconds)}</TableCell>
              <TableCell className="align-top">
                {e.invoiceId ? (
                  <Link href={`/portal/invoices/${e.invoiceId}`}>
                    <StatusBadge tone={def.tone} label={CLIENT_LABELS[key] ?? def.label} />
                  </Link>
                ) : (
                  <StatusBadge tone={def.tone} label={CLIENT_LABELS[key] ?? def.label} />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
