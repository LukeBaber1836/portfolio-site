"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateSettingsAction } from "@/app/admin/_actions/settings";
import { FormField, TextInput } from "@/components/shared/FormField";
import { FieldSelect, FieldSelectItem } from "@/components/shared/FieldSelect";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Settings } from "@/lib/db/schema";

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [v, setV] = useState({
    businessName: settings.businessName,
    businessEmail: settings.businessEmail,
    defaultRate: (settings.defaultRateCents / 100).toString(),
    roundingMinutes: String(settings.roundingMinutes),
    defaultTermsDays: String(settings.defaultTermsDays),
    longTimerAlertHours: String(settings.longTimerAlertHours),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const bind = (k: keyof typeof v) => ({
    id: `s-${k}`,
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value })),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    const res = await updateSettingsAction(v);
    if (!res.ok) {
      setState("idle");
      setErrors(res.fieldErrors ?? {});
      toast.error(res.error);
      return;
    }
    setState("success");
    toast.success(res.message);
    setTimeout(() => {
      setState("idle");
      router.refresh();
    }, 800);
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing defaults</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Default hourly rate" htmlFor="s-defaultRate" error={errors.defaultRate}>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40">$</span>
              <TextInput {...bind("defaultRate")} inputMode="decimal" className="pl-8" />
            </div>
          </FormField>
          <FormField label="Default payment terms" htmlFor="s-defaultTermsDays" error={errors.defaultTermsDays}>
            <FieldSelect id="s-defaultTermsDays" value={v.defaultTermsDays} onValueChange={(val) => setV((s) => ({ ...s, defaultTermsDays: val }))}>
              {[0, 7, 14, 15, 30, 45, 60].map((d) => (
                <FieldSelectItem key={d} value={String(d)}>
                  {d === 0 ? "Due on receipt" : `Net ${d}`}
                </FieldSelectItem>
              ))}
            </FieldSelect>
          </FormField>
          <FormField
            label="Invoice rounding"
            htmlFor="s-roundingMinutes"
            error={errors.roundingMinutes}
            tooltip="Applied to each project's total on an invoice. Logged time is always stored exactly."
          >
            <FieldSelect
              id="s-roundingMinutes"
              value={v.roundingMinutes}
              onValueChange={(val) => setV((s) => ({ ...s, roundingMinutes: val }))}
            >
              <FieldSelectItem value="0">Exact minutes</FieldSelectItem>
              <FieldSelectItem value="6">Nearest 6 minutes (0.1 h)</FieldSelectItem>
              <FieldSelectItem value="15">Nearest 15 minutes</FieldSelectItem>
              <FieldSelectItem value="30">Nearest 30 minutes</FieldSelectItem>
            </FieldSelect>
          </FormField>
          <FormField
            label="Long timer alert"
            htmlFor="s-longTimerAlertHours"
            error={errors.longTimerAlertHours}
            tooltip="Email me if a timer runs longer than this."
          >
            <FieldSelect
              id="s-longTimerAlertHours"
              value={v.longTimerAlertHours}
              onValueChange={(val) => setV((s) => ({ ...s, longTimerAlertHours: val }))}
            >
              {[4, 6, 8, 10, 12].map((h) => (
                <FieldSelectItem key={h} value={String(h)}>
                  {h} hours
                </FieldSelectItem>
              ))}
            </FieldSelect>
          </FormField>
        </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="Business name" htmlFor="s-businessName" error={errors.businessName}>
            <TextInput {...bind("businessName")} />
          </FormField>
          <FormField label="Business email" htmlFor="s-businessEmail" error={errors.businessEmail}>
            <TextInput {...bind("businessEmail")} type="email" />
          </FormField>
        </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton state={state} pendingLabel="Saving…" successLabel="Saved">
          Save settings
        </SubmitButton>
      </div>
    </form>
  );
}
