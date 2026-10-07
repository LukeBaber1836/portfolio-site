"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { saveProjectDomainsAction } from "@/app/admin/_actions/projects";
import { FormField, TextInput } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";

export function DomainsForm({ projectId, productionUrl, devUrl }: { projectId: string; productionUrl: string | null; devUrl: string | null }) {
  const router = useRouter();
  const [prod, setProd] = useState(productionUrl ?? "");
  const [dev, setDev] = useState(devUrl ?? "");
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [errorKey, setErrorKey] = useState(0);
  const dirty = prod.trim() !== (productionUrl ?? "") || dev.trim() !== (devUrl ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    setErrors({});
    const res = await saveProjectDomainsAction(projectId, { productionUrl: prod, devUrl: dev });
    if (!res.ok) {
      setState("idle");
      setErrors(res.fieldErrors ?? {});
      setErrorKey((k) => k + 1);
      if (!res.fieldErrors) toast.error(res.error);
      return;
    }
    setState("success");
    toast.success(res.message);
    setTimeout(() => {
      setState("idle");
      router.refresh();
    }, 400);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label="Production" htmlFor="domain-prod" optional error={errors.productionUrl} errorKey={errorKey}>
        <TextInput
          id="domain-prod"
          type="text"
          inputMode="url"
          autoComplete="off"
          value={prod}
          onChange={(e) => setProd(e.target.value)}
          placeholder="example.com"
        />
      </FormField>
      <FormField label="Development" htmlFor="domain-dev" optional error={errors.devUrl} errorKey={errorKey}>
        <TextInput
          id="domain-dev"
          type="text"
          inputMode="url"
          autoComplete="off"
          value={dev}
          onChange={(e) => setDev(e.target.value)}
          placeholder="staging.example.com"
        />
      </FormField>
      <div className="flex justify-end">
        <SubmitButton state={state} size="sm" pendingLabel="Saving…" successLabel="Saved" disabled={!dirty}>
          Save domains
        </SubmitButton>
      </div>
    </form>
  );
}
