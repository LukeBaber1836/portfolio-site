"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createClientAction, updateClientAction, type ClientFormInput } from "@/app/admin/_actions/clients";
import { FormField, TextArea, TextInput } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Client } from "@/lib/db/schema";

const centsToDollars = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(/\.00$/, ""));

export function ClientForm({
  client,
  defaults,
}: {
  client?: Client;
  defaults: { rateCents: number; termsDays: number; storageUrl: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({
    name: client?.name ?? "",
    company: client?.company ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    defaultRate: centsToDollars(client?.defaultRateCents),
    termsDays: client?.termsDays?.toString() ?? "",
    storageUsername: client?.storageUsername ?? "",
    storagePath: client?.storagePath ?? "",
    notesInternal: client?.notesInternal ?? "",
  });
  const [sendInvite, setSendInvite] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorKey, setErrorKey] = useState(0);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");

  const bind = (key: string) => ({
    id: key,
    value: values[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    setErrors({});
    const payload = { ...values, sendInvite } as ClientFormInput;
    const res = client ? await updateClientAction(client.id, payload) : await createClientAction(payload);
    if (!res.ok) {
      setState("idle");
      setErrors(res.fieldErrors ?? {});
      setErrorKey((k) => k + 1);
      toast.error(res.error);
      return;
    }
    setState("success");
    if (res.message) toast.success(res.message);
    const id = client?.id ?? (res.data as { id: string }).id;
    setTimeout(() => {
      router.push(`/admin/clients/${id}`);
      router.refresh();
    }, client ? 300 : 500);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <fieldset className="grid gap-5 md:grid-cols-2">
        <legend className="mb-4 text-sm font-semibold text-white">Contact</legend>
        <FormField label="Contact name" htmlFor="name" error={errors.name} errorKey={errorKey}>
          <TextInput {...bind("name")} autoComplete="off" placeholder="Sarah Jones" required />
        </FormField>
        <FormField label="Company" htmlFor="company" optional error={errors.company}>
          <TextInput {...bind("company")} placeholder="Acme Landscaping" />
        </FormField>
        <FormField
          label="Email"
          htmlFor="email"
          error={errors.email}
          errorKey={errorKey}
          hint={client ? "Changing this doesn't change their login email." : "They'll sign in to the portal with this address."}
        >
          <TextInput {...bind("email")} type="email" placeholder="sarah@acme.com" required />
        </FormField>
        <FormField label="Phone" htmlFor="phone" optional>
          <TextInput {...bind("phone")} type="tel" placeholder="(903) 555-0123" />
        </FormField>
      </fieldset>

      <fieldset className="grid gap-5 md:grid-cols-2">
        <legend className="mb-4 text-sm font-semibold text-white">Billing</legend>
        <FormField label="Hourly rate" htmlFor="defaultRate" optional error={errors.defaultRate} errorKey={errorKey} hint={`Leave blank to use your default ($${defaults.rateCents / 100}/h).`}>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/40">$</span>
            <TextInput {...bind("defaultRate")} inputMode="decimal" placeholder={String(defaults.rateCents / 100)} className="pl-8" />
          </div>
        </FormField>
        <FormField label="Payment terms (days)" htmlFor="termsDays" optional error={errors.termsDays} errorKey={errorKey} hint={`Blank = Net ${defaults.termsDays}.`}>
          <TextInput {...bind("termsDays")} inputMode="numeric" placeholder={String(defaults.termsDays)} />
        </FormField>
      </fieldset>

      <fieldset className="grid gap-5 md:grid-cols-2">
        <legend className="mb-4 text-sm font-semibold text-white">File storage</legend>
        <FormField label="Storage username" htmlFor="storageUsername" optional hint={`Only if they have their own login on ${defaults.storageUrl.replace("https://", "")}.`}>
          <TextInput {...bind("storageUsername")} placeholder="acme" autoComplete="off" />
        </FormField>
        <FormField
          label="Folder path"
          htmlFor="storagePath"
          optional
          hint="Portal uploads land here in a folder per project. Leave blank to use the client's own name. Changing it doesn't move existing files."
        >
          <TextInput {...bind("storagePath")} placeholder="Acme Co" autoComplete="off" />
        </FormField>
      </fieldset>

      <FormField label="Private notes" htmlFor="notesInternal" optional hint="Only visible to you.">
        <TextArea {...bind("notesInternal")} rows={3} />
      </FormField>

      {!client && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="send-invite" className="text-sm font-normal text-white">
                Email a portal invite now
              </Label>
              <p className="mt-0.5 text-xs leading-5 text-white/50">Creates their login and sends a branded welcome email with a set-password link. A Stripe customer is created either way.</p>
            </div>
            <Switch id="send-invite" checked={sendInvite} onCheckedChange={setSendInvite} />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <SubmitButton state={state} pendingLabel={client ? "Saving…" : "Creating…"} successLabel={client ? "Saved" : "Created"}>
          {client ? "Save changes" : "Create client"}
        </SubmitButton>
      </div>
    </form>
  );
}
