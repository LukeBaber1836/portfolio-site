"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createProjectAction, updateProjectAction, type ProjectFormInput } from "@/app/admin/_actions/projects";
import { FormField, TextArea, TextInput } from "@/components/shared/FormField";
import { DatePicker } from "@/components/shared/DatePicker";
import { FieldSelect, FieldSelectItem } from "@/components/shared/FieldSelect";
import { SlidingTabs } from "@/components/shared/SlidingTabs";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Project, ProjectStatus, ServiceType } from "@/lib/db/schema";
import { PROJECT_STATUS, SERVICE_TYPES } from "@/lib/status";

const dollars = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(/\.00$/, ""));

export function ProjectForm({
  project,
  clients,
  defaultClientId,
  defaultRateCents,
  onDone,
}: {
  project?: Project;
  clients: { id: string; name: string; company: string | null }[];
  defaultClientId?: string;
  defaultRateCents: number;
  onDone?: (id: string) => void;
}) {
  const router = useRouter();
  const [v, setV] = useState({
    clientId: project?.clientId ?? defaultClientId ?? clients[0]?.id ?? "",
    name: project?.name ?? "",
    description: project?.description ?? "",
    serviceType: (project?.serviceType ?? "web_dev") as ServiceType,
    status: (project?.status ?? "planned") as ProjectStatus,
    billingType: project?.billingType ?? "hourly",
    rate: dollars(project?.rateCents),
    fixedPrice: dollars(project?.fixedPriceCents),
    budgetHours: project?.budgetHours?.toString() ?? "",
    progressPct: project?.progressPct ?? 0,
    startDate: project?.startDate ?? "",
    dueDate: project?.dueDate ?? "",
    clientVisible: project?.clientVisible ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorKey, setErrorKey] = useState(0);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((s) => ({ ...s, [k]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    setErrors({});
    const payload = v as ProjectFormInput;
    const res = project ? await updateProjectAction(project.id, payload) : await createProjectAction(payload);
    if (!res.ok) {
      setState("idle");
      setErrors(res.fieldErrors ?? {});
      setErrorKey((k) => k + 1);
      toast.error(res.error);
      return;
    }
    setState("success");
    toast.success(res.message);
    const id = project?.id ?? (res.data as { id: string }).id;
    setTimeout(() => {
      if (onDone) onDone(id);
      else router.push(`/admin/projects/${id}`);
      router.refresh();
    }, 350);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Client" htmlFor="p-client" error={errors.clientId} errorKey={errorKey}>
          <FieldSelect id="p-client" value={v.clientId} onValueChange={(val) => set("clientId", val)} disabled={!!project}>
            {clients.map((c) => (
              <FieldSelectItem key={c.id} value={c.id}>
                {c.company || c.name}
              </FieldSelectItem>
            ))}
          </FieldSelect>
        </FormField>
        <FormField label="Project name" htmlFor="p-name" error={errors.name} errorKey={errorKey}>
          <TextInput id="p-name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Website redesign" />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="p-desc" optional hint="Visible to your client.">
        <TextArea id="p-desc" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} />
      </FormField>

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Service" htmlFor="p-service">
          <FieldSelect id="p-service" value={v.serviceType} onValueChange={(val) => set("serviceType", val as ServiceType)}>
            {SERVICE_TYPES.map((s) => (
              <FieldSelectItem key={s.value} value={s.value}>
                {s.label}
              </FieldSelectItem>
            ))}
          </FieldSelect>
        </FormField>
        <FormField label="Status" htmlFor="p-status">
          <FieldSelect id="p-status" value={v.status} onValueChange={(val) => set("status", val as ProjectStatus)}>
            {Object.entries(PROJECT_STATUS).map(([value, def]) => (
              <FieldSelectItem key={value} value={value}>
                {def.label}
              </FieldSelectItem>
            ))}
          </FieldSelect>
        </FormField>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-white/60">Billing</p>
        <SlidingTabs
          size="sm"
          value={v.billingType}
          onChange={(val) => set("billingType", val as "hourly" | "fixed")}
          items={[
            { value: "hourly", label: "Hourly" },
            { value: "fixed", label: "Fixed price" },
          ]}
        />
        <div className="grid gap-5 md:grid-cols-2">
          {v.billingType === "hourly" ? (
            <FormField label="Rate override" htmlFor="p-rate" optional error={errors.rate} errorKey={errorKey} hint={`Blank uses the client's rate (or $${defaultRateCents / 100}/h).`}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40">$</span>
                <TextInput id="p-rate" inputMode="decimal" className="pl-8" value={v.rate} onChange={(e) => set("rate", e.target.value)} />
              </div>
            </FormField>
          ) : (
            <FormField label="Fixed price" htmlFor="p-fixed" optional error={errors.fixedPrice} errorKey={errorKey} hint="For reference; invoice it as a line item.">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40">$</span>
                <TextInput id="p-fixed" inputMode="decimal" className="pl-8" value={v.fixedPrice} onChange={(e) => set("fixedPrice", e.target.value)} />
              </div>
            </FormField>
          )}
          <FormField label="Budget (hours)" htmlFor="p-budget" optional error={errors.budgetHours} errorKey={errorKey} hint="Shows a progress bar against logged time.">
            <TextInput id="p-budget" inputMode="numeric" value={v.budgetHours} onChange={(e) => set("budgetHours", e.target.value)} />
          </FormField>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <FormField label="Start date" htmlFor="p-start" optional>
          <DatePicker id="p-start" value={v.startDate} onChange={(d) => set("startDate", d)} />
        </FormField>
        <FormField label="Due date" htmlFor="p-due" optional error={errors.dueDate} errorKey={errorKey}>
          <DatePicker id="p-due" value={v.dueDate} onChange={(d) => set("dueDate", d)} />
        </FormField>
        <FormField label={`Progress · ${v.progressPct}%`} htmlFor="p-progress">
          <input
            id="p-progress"
            type="range"
            min={0}
            max={100}
            step={5}
            value={v.progressPct}
            onChange={(e) => set("progressPct", Number(e.target.value))}
            className="h-11 w-full cursor-pointer accent-[#f3d076]"
          />
        </FormField>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label htmlFor="p-visible" className="text-sm font-normal text-white">
              Visible in client portal
            </Label>
            <p className="mt-0.5 text-xs leading-5 text-white/50">Turn off for internal projects. Hidden projects&apos; time still appears on invoices you send.</p>
          </div>
          <Switch id="p-visible" checked={v.clientVisible} onCheckedChange={(c) => set("clientVisible", c)} />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton state={state} pendingLabel="Saving…" successLabel="Saved">
          {project ? "Save project" : "Create project"}
        </SubmitButton>
      </div>
    </form>
  );
}
