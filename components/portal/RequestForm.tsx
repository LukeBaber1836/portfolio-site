"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { submitRequestAction } from "@/app/portal/_actions";
import { FormField, TextArea, TextInput } from "@/components/shared/FormField";
import { FieldSelect, FieldSelectItem } from "@/components/shared/FieldSelect";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { SERVICE_TYPES } from "@/lib/status";

export function RequestForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [service, setService] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorKey, setErrorKey] = useState(0);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    const res = await submitRequestAction({ title, body, serviceType: (service || undefined) as never });
    if (!res.ok) {
      setState("idle");
      setErrors(res.fieldErrors ?? {});
      setErrorKey((k) => k + 1);
      return;
    }
    setState("success");
    toast.success(res.message);
    setTimeout(() => {
      setTitle("");
      setBody("");
      setService("");
      setErrors({});
      setState("idle");
      router.refresh();
      onDone?.();
    }, 900);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormField label="What do you need?" htmlFor="rq-title" error={errors.title} errorKey={errorKey}>
        <TextInput id="rq-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a booking page for spring specials" maxLength={160} />
      </FormField>
      <FormField label="Type of work" htmlFor="rq-service" optional>
        <FieldSelect
          id="rq-service"
          value={service || "unsure"}
          onValueChange={(v) => setService(v === "unsure" ? "" : v)}
        >
          <FieldSelectItem value="unsure">Not sure</FieldSelectItem>
          {SERVICE_TYPES.map((s) => (
            <FieldSelectItem key={s.value} value={s.value}>
              {s.label}
            </FieldSelectItem>
          ))}
        </FieldSelect>
      </FormField>
      <FormField label="Details" htmlFor="rq-body" error={errors.body} errorKey={errorKey} hint="Links, deadlines, and examples you like are all helpful.">
        <TextArea id="rq-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
      </FormField>
      <SubmitButton state={state} className="w-full" pendingLabel="Sending…" successLabel="Sent!">
        Send request
      </SubmitButton>
    </form>
  );
}
