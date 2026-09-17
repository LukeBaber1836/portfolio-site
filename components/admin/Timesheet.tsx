"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteEntryAction, setBillableAction } from "@/app/admin/_actions/time";
import type { ProjectOption } from "@/components/admin/ProjectPicker";
import { TimeEntryDialog, type EditableEntry } from "@/components/admin/TimeEntryDialog";
import { ActionButton } from "@/components/shared/ActionButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TIME_STATUS } from "@/lib/status";

export type TimesheetRow = EditableEntry & {
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
  amountLabel: string;
  projectName: string;
  clientName: string;
  status: keyof typeof TIME_STATUS;
  editable: boolean;
};

export function Timesheet({ rows, projects, today }: { rows: TimesheetRow[]; projects: ProjectOption[]; today: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<{ open: boolean; entry: EditableEntry | null; key: number }>({ open: false, entry: null, key: 0 });

  const editableIds = useMemo(() => rows.filter((r) => r.editable).map((r) => r.id), [rows]);
  const allSelected = editableIds.length > 0 && editableIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function bulk(billable: boolean) {
    const res = await setBillableAction([...selected], billable);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  const openDialog = (entry: EditableEntry | null) => setDialog((d) => ({ open: true, entry, key: d.key + 1 }));

  return (
    <>
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
        {selected.size > 0 ? (
          <div className="t-panel-slide flex flex-wrap items-center gap-2" data-open="true" style={{ ["--panel-translate-y" as string]: "4px" }}>
            <span className="text-sm text-white">{selected.size} selected</span>
            <Button variant="outline" size="sm" onClick={() => bulk(true)}>
              Billable
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulk(false)}>
              No charge
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        ) : (
          <p className="text-sm text-white/50">{rows.length} entries</p>
        )}
        <Button size="sm" onClick={() => openDialog(null)}>
          <Plus /> Add time
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Clock} title="No time in this range" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={someSelected ? "indeterminate" : allSelected}
                  aria-label="Select all editable entries"
                  onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(editableIds))}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Work</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const def = TIME_STATUS[r.status]!;
              return (
                <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined} className="group">
                  <TableCell className="align-top">
                    {r.editable ? (
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} aria-label={`Select entry from ${r.dateLabel}`} />
                    ) : (
                      <span className="block size-[18px]" />
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <span className="block text-white/80">{r.dateLabel}</span>
                    <span className="block text-xs text-white/35">{r.timeLabel}</span>
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal align-top">
                    <span className="block text-xs text-white/40">
                      {r.clientName} · {r.projectName}
                    </span>
                    <span className="block text-sm leading-6 text-white/85">{r.description}</span>
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums text-white/80">{r.durationLabel}</TableCell>
                  <TableCell className="text-right align-top tabular-nums text-white/60">{r.amountLabel}</TableCell>
                  <TableCell className="align-top">
                    <StatusBadge tone={def.tone} label={def.label} />
                  </TableCell>
                  <TableCell className="align-top">
                    {r.editable && (
                      <div className="flex justify-end opacity-60 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon-sm" aria-label="Edit entry" onClick={() => openDialog(r)}>
                          <Pencil />
                        </Button>
                        <ActionButton
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete entry"
                          className="hover:text-danger"
                          action={() => deleteEntryAction(r.id)}
                          confirm={{ title: "Delete this entry?", description: `${r.durationLabel} on ${r.dateLabel} — ${r.description}`, confirmLabel: "Delete", destructive: true }}
                        >
                          <Trash2 />
                        </ActionButton>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <TimeEntryDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        entry={dialog.entry}
        projects={projects}
        today={today}
      />
    </>
  );
}
