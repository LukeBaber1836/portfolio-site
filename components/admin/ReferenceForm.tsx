"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { sendReferenceAction } from "@/app/admin/_actions/projects";
import { FormField, TextInput } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";

export function ReferenceForm({ projectId, onDone }: { projectId: string; onDone?: () => void }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    setError(null);
    const res = await sendReferenceAction(projectId, { url, title, note });
    if (!res.ok) {
      setState("idle");
      setError(res.fieldErrors?.url ?? res.error);
      setErrorKey((k) => k + 1);
      return;
    }
    setState("success");
    toast.success(res.message);
    setUrl("");
    setTitle("");
    setNote("");
    setError(null);
    setTimeout(() => {
      setState("idle");
      router.refresh();
      onDone?.();
    }, 400);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label="Link" htmlFor="ref-url" error={error} errorKey={errorKey} hint="Leave empty to send a text-only note.">
        <TextInput
          id="ref-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/inspiration"
        />
      </FormField>
      <FormField label="Label" htmlFor="ref-title" optional>
        <TextInput
          id="ref-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Defaults to the page title"
          maxLength={160}
        />
      </FormField>
      <FormField label="Note" htmlFor="ref-note" optional>
        <TextInput
          id="ref-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why I'm sending this…"
          maxLength={500}
        />
      </FormField>
      <div className="flex justify-end">
      <SubmitButton state={state} size="sm" pendingLabel="Sending…" successLabel="Sent" disabled={!url.trim() && !note.trim()}>
          <Send /> Send reference
        </SubmitButton>
    </div>
    </form>
  );
}
