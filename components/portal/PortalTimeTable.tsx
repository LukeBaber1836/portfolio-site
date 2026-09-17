import Link from "next/link";

import { StatusBadge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { TIME_STATUS } from "@/lib/status";

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

export function PortalTimeTable({ entries, showProject }: { entries: Entry[]; showProject?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Date</TableHead>
          <TableHead>What I worked on</TableHead>
          <TableHead className="text-right">Time</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => {
          const key = statusKey(e);
          const def = TIME_STATUS[key]!;
          return (
            <TableRow key={e.id}>
              <TableCell className="align-top">
                <span className="block text-white/80">{formatDate(e.startedAt, "EEE, MMM d")}</span>
                <span className="block text-xs text-white/35">
                  {formatTime(e.startedAt)}–{formatTime(e.endedAt)}
                </span>
              </TableCell>
              <TableCell className="max-w-lg whitespace-normal align-top">
                {showProject && (
                  <Link href={`/portal/projects/${e.projectId}`} className="block text-xs text-white/40 hover:text-accent">
                    {e.projectName}
                  </Link>
                )}
                <span className="block text-sm leading-6 text-white/85">{e.description}</span>
              </TableCell>
              <TableCell className="text-right align-top tabular-nums text-white/85">{formatDuration(e.durationSeconds)}</TableCell>
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
