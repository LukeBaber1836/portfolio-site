"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createDraftInvoiceAction, loadUnbilledAction } from "@/app/admin/_actions/invoices";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { Disclosure } from "@/components/shared/Disclosure";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormField, TextInput } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { groupEntriesForInvoice, invoiceTotalCents } from "@/lib/billing";
import { formatDate, formatDuration, formatHours, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type ClientOption = { id: string; name: string; company: string | null; termsDays: number; rateCents: number };
type Entry = Awaited<ReturnType<typeof loadUnbilledAction>>[number];
type Item = { key: number; description: string; quantity: string; unit: string };

export function InvoiceBuilder({
  clients,
  initialClientId,
  roundingMinutes,
  defaultRateCents,
}: {
  clients: ClientOption[];
  initialClientId?: string;
  roundingMinutes: number;
  defaultRateCents: number;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(initialClientId && clients.some((c) => c.id === initialClientId) ? initialClientId : "");
  const client = clients.find((c) => c.id === clientId);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, startLoading] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<Item[]>([]);
  const [terms, setTerms] = useState(client?.termsDays ?? 15);
  const [memo, setMemo] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [openedAt] = useState(() => Date.now());

  const loadClient = useCallback((id: string) => {
    startLoading(async () => {
      const rows = id ? await loadUnbilledAction(id) : [];
      setEntries(rows);
      setSelected(new Set(rows.map((r) => r.id)));
    });
  }, []);

  function selectClient(id: string) {
    setClientId(id);
    setTerms(clients.find((c) => c.id === id)?.termsDays ?? 15);
    loadClient(id);
  }

  // Deep link (?client=…): load that client's hours once on mount.
  useEffect(() => {
    if (clientId) loadClient(clientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  const byProject = useMemo(() => {
    const map = new Map<string, { name: string; entries: Entry[] }>();
    for (const e of entries) {
      const g = map.get(e.projectId) ?? { name: e.projectName, entries: [] };
      g.entries.push(e);
      map.set(e.projectId, g);
    }
    return [...map.entries()];
  }, [entries]);

  // Same pure function the server uses, so the preview matches the Stripe invoice exactly.
  const groups = useMemo(
    () =>
      groupEntriesForInvoice(
        entries
          .filter((e) => selected.has(e.id))
          .map((e) => ({
            id: e.id,
            projectId: e.projectId,
            projectName: e.projectName,
            durationSeconds: e.durationSeconds,
            rateCents: e.rateCents ?? defaultRateCents,
            startedAt: new Date(e.startedAt),
          })),
        roundingMinutes,
      ),
    [entries, selected, roundingMinutes, defaultRateCents],
  );

  const parsedItems = items
    .map((i) => ({
      description: i.description.trim(),
      quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
      unitAmountCents: Math.round(Number(i.unit.replace(/[$,]/g, "")) * 100),
    }))
    .filter((i) => i.description && i.unitAmountCents > 0);
  const total = invoiceTotalCents(groups, parsedItems);
  const itemsInvalid = items.some((i) => i.description.trim() || i.unit) && parsedItems.length !== items.length;

  const toggleIds = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    setState("pending");
    const res = await createDraftInvoiceAction({
      clientId,
      entryIds: [...selected],
      items: parsedItems,
      daysUntilDue: terms,
      memo,
    });
    if (!res.ok) {
      setState("idle");
      toast.error(res.error);
      return;
    }
    setState("success");
    toast.success(res.message, { description: "Review it, then finalize & send." });
    setTimeout(() => router.push(`/admin/invoices/${res.data.id}`), 450);
  }

  const ghostInput =
    "h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-white placeholder:text-fg-3 outline-none transition-[border-color,box-shadow] hover:border-white/[0.08] focus:border-accent/50 focus:ring-[3px] focus:ring-accent/15";
  const dueLabel = client ? formatDate(new Date(openedAt + terms * 86_400_000), "MMM d, yyyy") : null;

  return (
    <form onSubmit={create}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          {/* Bill to + terms */}
          <section className="grid gap-4 sm:grid-cols-2">
            <FormField label="Bill to" htmlFor="ib-client">
              <Select value={clientId} onValueChange={selectClient}>
                <SelectTrigger id="ib-client" className="text-sm text-white">
                  <SelectValue placeholder="Choose a client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Payment terms" htmlFor="ib-terms" hint={dueLabel ? `Due ${dueLabel} if sent today.` : undefined}>
              <Select value={String(terms)} onValueChange={(v) => setTerms(Number(v))}>
                <SelectTrigger id="ib-terms" className="text-sm text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 7, 14, 15, 30, 45, 60].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d === 0 ? "Due on receipt" : `Net ${d}`}
                    </SelectItem>
                  ))}
                  {![0, 7, 14, 15, 30, 45, 60].includes(terms) && <SelectItem value={String(terms)}>Net {terms}</SelectItem>}
                </SelectContent>
              </Select>
            </FormField>
          </section>

          {/* Unbilled hours */}
          <section>
            <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">Unbilled hours</h2>
                <p className="text-xs text-fg-3">{roundingMinutes ? `Rounded to ${roundingMinutes} min per project.` : "Billed to the exact minute."}</p>
              </div>
              {entries.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => toggleIds(entries.map((e) => e.id), selected.size !== entries.length)}>
                  {selected.size === entries.length ? "Clear all" : "Select all"}
                </Button>
              )}
            </div>
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              {!clientId ? (
                <EmptyState compact title="Pick a client to load their hours" />
              ) : loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-fg-3">
                  <Loader2 className="size-4 animate-spin" /> Loading hours…
                </div>
              ) : entries.length === 0 ? (
                <EmptyState compact title="No unbilled hours" description="Fixed-price work can still go in line items." />
              ) : (
                <div className="divide-y divide-line">
                  {byProject.map(([projectId, g]) => {
                    const ids = g.entries.map((e) => e.id);
                    const count = ids.filter((id) => selected.has(id)).length;
                    const seconds = g.entries.filter((e) => selected.has(e.id)).reduce((s, e) => s + e.durationSeconds, 0);
                    return (
                      <Disclosure
                        key={projectId}
                        defaultOpen={byProject.length === 1}
                        className="px-4"
                        leading={
                          <Checkbox
                            checked={count === ids.length ? true : count > 0 ? "indeterminate" : false}
                            onCheckedChange={() => toggleIds(ids, count !== ids.length)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select all ${g.name} entries`}
                          />
                        }
                        title={
                          <span className="flex items-center gap-3">
                            <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
                            <span className="text-xs tabular-nums text-fg-3">
                              {count}/{ids.length} · {formatHours(seconds)}
                            </span>
                          </span>
                        }
                      >
                        <ul className="mb-3 pl-7">
                          {g.entries.map((e) => (
                            <li key={e.id} className="flex min-h-9 items-center gap-3 rounded-md px-2 text-[13px] hover:bg-white/[0.03]">
                              <Checkbox
                                checked={selected.has(e.id)}
                                onCheckedChange={() => toggleIds([e.id], !selected.has(e.id))}
                                aria-label={`Include ${formatDate(e.startedAt, "MMM d")} entry`}
                              />
                              <span className="w-14 shrink-0 text-xs text-fg-3">{formatDate(e.startedAt, "MMM d")}</span>
                              <span className={cn("min-w-0 flex-1 truncate", selected.has(e.id) ? "text-white" : "text-fg-3 line-through")}>
                                {e.description}
                              </span>
                              <span className="shrink-0 text-xs tabular-nums text-fg-2">{formatDuration(e.durationSeconds)}</span>
                            </li>
                          ))}
                        </ul>
                      </Disclosure>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Line items: inline editable table */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-white">Line items</h2>
            <div className="overflow-x-auto rounded-lg border border-line bg-surface">
              <div className="min-w-[520px]">
                {items.length > 0 && (
                  <div className="divide-y divide-line">
                    <div className="grid grid-cols-[1fr_4rem_6.5rem_6rem_2rem] items-center gap-2 px-2 py-2 text-xs text-fg-3">
                      <span className="px-2">Description</span>
                      <span className="px-2 text-center">Qty</span>
                      <span className="px-2 text-right">Price</span>
                      <span className="px-2 text-right">Amount</span>
                      <span />
                    </div>
                    {items.map((item, idx) => {
                      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
                      const unitCents = Math.round(Number(item.unit.replace(/[$,]/g, "")) * 100) || 0;
                      return (
                        <div key={item.key} className="group grid grid-cols-[1fr_4rem_6.5rem_6rem_2rem] items-center gap-2 px-2 py-1.5">
                          <input
                            aria-label="Description"
                            placeholder="e.g. Domain + hosting setup"
                            value={item.description}
                            onChange={(e) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it)))}
                            className={ghostInput}
                          />
                          <input
                            aria-label="Quantity"
                            inputMode="numeric"
                            value={item.quantity}
                            onChange={(e) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, quantity: e.target.value } : it)))}
                            className={cn(ghostInput, "text-center tabular-nums")}
                          />
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-fg-3">$</span>
                            <input
                              aria-label="Unit price"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={item.unit}
                              onChange={(e) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, unit: e.target.value } : it)))}
                              className={cn(ghostInput, "pl-5 text-right tabular-nums")}
                            />
                          </div>
                          <span className="px-2 text-right text-sm tabular-nums text-fg-2">{formatMoney(qty * unitCents)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Remove item"
                            className="size-7 text-fg-3 opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                            onClick={() => setItems((list) => list.filter((_, i) => i !== idx))}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setItems((list) => [...list, { key: Date.now(), description: "", quantity: "1", unit: "" }])}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-[13px] text-fg-3 transition-colors hover:bg-white/[0.025] hover:text-white focus-visible:bg-white/[0.03] focus-visible:outline-none",
                    items.length > 0 && "border-t border-line",
                  )}
                >
                  <Plus className="size-4" aria-hidden /> Add line item
                </button>
              </div>
            </div>
            {itemsInvalid && <p className="mt-2 text-xs text-danger">Each line item needs a description and a price.</p>}
          </section>

          <FormField label="Memo" htmlFor="ib-memo" optional hint="Shown on the invoice.">
            <TextInput id="ib-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Thanks for the work this month." maxLength={500} />
          </FormField>
        </div>

        {/* Summary: what Stripe will bill (same grouping function as the server) */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-line bg-surface">
            <p className="border-b border-line px-4 py-3 text-xs font-medium text-fg-2">Summary</p>
            <ul className="space-y-3 px-4 py-3 text-[13px]">
              {groups.map((g) => (
                <li key={g.key} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-white">{g.projectName}</span>
                    <span className="block text-xs text-fg-3">
                      {formatHours(g.billedSeconds)} × {formatMoney(g.rateCents)}/h
                      {g.billedSeconds !== g.loggedSeconds && ` (logged ${formatHours(g.loggedSeconds)})`}
                    </span>
                  </span>
                  <span className="tabular-nums text-white">{formatMoney(g.amountCents)}</span>
                </li>
              ))}
              {parsedItems.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-white">
                    {i.description}
                    {i.quantity > 1 && <span className="text-fg-3"> ×{i.quantity}</span>}
                  </span>
                  <span className="tabular-nums text-white">{formatMoney(i.quantity * i.unitAmountCents)}</span>
                </li>
              ))}
              {!groups.length && !parsedItems.length && <li className="text-fg-3">Select hours or add line items.</li>}
            </ul>
            <div className="flex items-baseline justify-between border-t border-line px-4 py-3">
              <span className="text-[13px] text-fg-2">Total</span>
              <span className="text-xl font-semibold tabular-nums text-white">
                <AnimatedNumber value={formatMoney(total)} />
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-8 flex items-center justify-between gap-4 border-t border-line bg-background/90 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
        <p className="min-w-0 text-xs leading-5 text-fg-3">Creates a Stripe draft and locks the selected hours. Nothing is sent yet.</p>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm tabular-nums text-white sm:inline">{formatMoney(total)}</span>
          <SubmitButton
            state={state}
            size="sm"
            disabled={!clientId || total <= 0 || itemsInvalid}
            pendingLabel="Creating in Stripe…"
            successLabel="Draft created"
          >
            Create draft
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
