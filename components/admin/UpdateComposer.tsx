"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { postUpdateAction } from "@/app/admin/_actions/projects";
import { FormField, TextArea } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function UpdateComposer({ projectId, clientVisible }: { projectId: string; clientVisible: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [notify, setNotify] = useState(clientVisible);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    const res = await postUpdateAction(projectId, { body, notify: notify && clientVisible });
    if (!res.ok) {
      setState("idle");
      setError(res.fieldErrors?.body ?? res.error);
      setErrorKey((k) => k + 1);
      return;
    }
    setState("success");
    toast.success(res.message);
    setTimeout(() => {
      setBody("");
      setError(null);
      setState("idle");
      router.refresh();
    }, 400);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <FormField label="Post an update" htmlFor="update-body" error={error} errorKey={errorKey}>
        <TextArea
          id="update-body"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What changed, what's next, and anything you need from them…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
          }}
        />
      </FormField>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {clientVisible ? (
          <div className="flex items-center gap-2">
            <Switch id="update-notify" checked={notify} onCheckedChange={setNotify} />
            <Label htmlFor="update-notify" className="text-xs font-normal text-white/70">
              Email the client
            </Label>
          </div>
        ) : (
          <span className="text-xs text-white/40">This project is hidden from the client portal.</span>
        )}
        <SubmitButton state={state} size="sm" pendingLabel="Posting…" successLabel="Posted" disabled={body.trim().length < 5}>
          <Send /> Post update
        </SubmitButton>
      </div>
    </form>
  );
}
