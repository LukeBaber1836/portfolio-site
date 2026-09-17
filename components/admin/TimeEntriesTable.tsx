import { Clock } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDuration, formatMoney, formatTime } from "@/lib/format";
import { TIME_STATUS } from "@/lib/status";

export type EntryRow = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  description: string | null;
  billable: boolean;
  rateCents?: number | null;
  invoiceId: string | null;
  invoiceStatus?: string | null;
  projectName: string;
  clientName?: string;
};

export function timeStatusKey(e: Pick<EntryRow, "billable" | "invoiceId" | "invoiceStatus" | "endedAt">) {
  if (!e.endedAt) return "running";
  if (!e.billable) return "no_charge";
  if (!e.invoiceId) return "unbilled";
  return e.invoiceStatus === "paid" ? "paid" : "invoiced";
}

/** Read-only time log (used on client & project detail). */
export function TimeEntriesTable({
  entries,
  showClient,
  showAmount = true,
  actions,
}: {
  entries: EntryRow[];
  showClient?: boolean;
  showAmount?: boolean;
  actions?: (entry: EntryRow) => React.ReactNode;
}) {
  if (!entries.length) {
    return <EmptyState compact icon={Clock} title="No time logged yet" description="Clock in from the top bar to start tracking." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Date</TableHead>
          <TableHead>Work</TableHead>
          <TableHead className="text-right">Duration</TableHead>
          {showAmount && <TableHead className="text-right">Amount</TableHead>}
          <TableHead>Status</TableHead>
          {actions && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => {
          const key = timeStatusKey(e);
          const def = TIME_STATUS[key]!;
          const seconds = e.durationSeconds ?? 0;
          return (
            <TableRow key={e.id}>
              <TableCell className="align-top">
                <span className="block text-white/80">{formatDate(e.startedAt, "EEE, MMM d")}</span>
                <span className="block text-xs text-white/35">
                  {formatTime(e.startedAt)}–{e.endedAt ? formatTime(e.endedAt) : "now"}
                </span>
              </TableCell>
              <TableCell className="max-w-md whitespace-normal align-top">
                <span className="block text-xs text-white/40">
                  {showClient && e.clientName ? `${e.clientName} · ` : ""}
                  {e.projectName}
                </span>
                <span className="block text-sm leading-6 text-white/85">{e.description || <span className="text-white/30">No description</span>}</span>
              </TableCell>
              <TableCell className="text-right align-top tabular-nums text-white/80">{formatDuration(seconds)}</TableCell>
              {showAmount && (
                <TableCell className="text-right align-top tabular-nums text-white/60">
                  {e.billable && e.rateCents != null ? formatMoney(Math.round((seconds / 3600) * e.rateCents)) : "—"}
                </TableCell>
              )}
              <TableCell className="align-top">
                <StatusBadge tone={def.tone} label={def.label} />
              </TableCell>
              {actions && <TableCell className="align-top">{actions(e)}</TableCell>}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
