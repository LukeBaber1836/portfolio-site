"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Clock, Loader2, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createDraftInvoiceAction, loadUnbilledAction } from "@/app/admin/_actions/invoices";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { Disclosure } from "@/components/shared/Disclosure";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormField, TextInput } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <form onSubmit={create} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardContent>
          <FormField label="Bill to" htmlFor="ib-client">
            <Select value={clientId} onValueChange={selectClient}>
              <SelectTrigger id="ib-client" className="h-11 text-sm text-white">
                <SelectValue placeholder="Choose a client…" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-popover">
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Unbilled hours</CardTitle>
              <CardDescription>{roundingMinutes ? `Totals round to the nearest ${roundingMinutes} minutes per project.` : "Billed to the exact minute."}</CardDescription>
            </div>
            <CardAction>{entries.length > 0 && (<Button type="button" variant="ghost" size="sm" onClick={() => toggleIds(entries.map((e) => e.id), selected.size !== entries.length)}>{selected.size === entries.length ? "Clear all" : "Select all"}</Button>)}</CardAction>
          </CardHeader>
          <CardContent className="p-2">
          {!clientId ? (
            <EmptyState compact icon={Receipt} title="Pick a client" />
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/50">
              <Loader2 className="size-4 animate-spin" /> Loading hours…
            </div>
          ) : entries.length === 0 ? (
            <EmptyState compact icon={Clock} title="No unbilled hours" description="You can still invoice fixed-price work with line items below." />
          ) : (
            <div className="divide-y divide-white/5">
              {byProject.map(([projectId, g]) => {
                const ids = g.entries.map((e) => e.id);
                const count = ids.filter((id) => selected.has(id)).length;
                const seconds = g.entries.filter((e) => selected.has(e.id)).reduce((s, e) => s + e.durationSeconds, 0);
                return (
                  <Disclosure
                    key={projectId}
                    defaultOpen={byProject.length === 1}
                    className="px-3"
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
                        <span className="text-xs tabular-nums text-white/50">
                          {count}/{ids.length} · {formatHours(seconds)}
                        </span>
                      </span>
                    }
                  >
                    <ul className="mb-3 space-y-1 pl-7">
                      {g.entries.map((e) => (
                        <li key={e.id} className="flex items-start gap-3 rounded-lg p-2 text-sm hover:bg-white/[0.03]">
                          <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleIds([e.id], !selected.has(e.id))} aria-label={`Include ${formatDate(e.startedAt, "MMM d")} entry`} />
                          <span className="w-16 shrink-0 text-xs leading-5 text-white/40">{formatDate(e.startedAt, "MMM d")}</span>
                          <span className={cn("min-w-0 flex-1 leading-5", selected.has(e.id) ? "text-white/85" : "text-white/35 line-through")}>{e.description}</span>
                          <span className="shrink-0 text-xs tabular-nums leading-5 text-white/60">{formatDuration(e.durationSeconds)}</span>
                        </li>
                      ))}
                    </ul>
                  </Disclosure>
                );
              })}
            </div>
          )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Line items</CardTitle>
            </div>
            <CardAction><Button type="button" variant="outline" size="sm" onClick={() => setItems((list) => [...list, { key: Date.now(), description: "", quantity: "1", unit: "" }])}><Plus /> Add item</Button></CardAction>
          </CardHeader>
          <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-white/40">No line items.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item, idx) => (
                <li key={item.key} className="grid grid-cols-[1fr_4.5rem_7rem_auto] items-center gap-2">
                  <TextInput
                    aria-label="Description"
                    placeholder="PETG print — 2 enclosures"
                    value={item.description}
                    onChange={(e) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it)))}
                  />
                  <TextInput
                    aria-label="Quantity"
                    inputMode="numeric"
                    value={item.quantity}
                    onChange={(e) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, quantity: e.target.value } : it)))}
                    className="text-center"
                  />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">$</span>
                    <TextInput
                      aria-label="Unit price"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={item.unit}
                      onChange={(e) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, unit: e.target.value } : it)))}
                      className="pl-7"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove item" className="hover:text-danger" onClick={() => setItems((list) => list.filter((_, i) => i !== idx))}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
          <ul className="space-y-3 text-sm">
            {groups.map((g) => (
              <li key={g.key} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-white/85">{g.projectName}</span>
                  <span className="block text-xs text-white/40">
                    {formatHours(g.billedSeconds)} × {formatMoney(g.rateCents)}/h
                    {g.billedSeconds !== g.loggedSeconds && ` (logged ${formatHours(g.loggedSeconds)})`}
                  </span>
                </span>
                <span className="tabular-nums text-white">{formatMoney(g.amountCents)}</span>
              </li>
            ))}
            {parsedItems.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-white/85">
                  {i.description}
                  {i.quantity > 1 && <span className="text-white/40"> ×{i.quantity}</span>}
                </span>
                <span className="tabular-nums text-white">{formatMoney(i.quantity * i.unitAmountCents)}</span>
              </li>
            ))}
            {!groups.length && !parsedItems.length && <li className="text-white/40">Select hours or add items.</li>}
          </ul>

          <div className="my-5 flex items-end justify-between border-t border-white/10 pt-4">
            <span className="text-xs uppercase tracking-wider text-white/50">Total</span>
            <span className="text-3xl font-bold text-accent">
              <AnimatedNumber value={formatMoney(total)} />
            </span>
          </div>

          <div className="space-y-4">
            <FormField label="Payment terms" htmlFor="ib-terms" hint={client ? `Due ${formatDate(new Date(openedAt + terms * 86_400_000), "MMM d, yyyy")} if sent today.` : undefined}>
              <Select value={String(terms)} onValueChange={(v) => setTerms(Number(v))}>
                <SelectTrigger id="ib-terms" className="h-11 text-sm text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-popover">
                  {[0, 7, 14, 15, 30, 45, 60].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d === 0 ? "Due on receipt" : `Net ${d}`}
                    </SelectItem>
                  ))}
                  {![0, 7, 14, 15, 30, 45, 60].includes(terms) && <SelectItem value={String(terms)}>Net {terms}</SelectItem>}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Memo" htmlFor="ib-memo" optional hint="Shown on the invoice.">
              <TextInput id="ib-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="September work — thanks!" maxLength={500} />
            </FormField>
            {itemsInvalid && <p className="text-xs text-danger">Each line item needs a description and a price.</p>}
            <SubmitButton state={state} className="h-11 w-full" disabled={!clientId || total <= 0 || itemsInvalid} pendingLabel="Creating in Stripe…" successLabel="Draft created">
              Create draft invoice
            </SubmitButton>
            <p className="text-center text-xs leading-5 text-white/40">Nothing is sent yet. Selected hours are locked to this draft.</p>
          </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
