"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Link2, Send, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteReferenceAction, sendReferenceAction } from "@/app/admin/_actions/projects";
import { ActionButton } from "@/components/shared/ActionButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormField, TextInput } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { statusBadgeFor } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { REFERENCE_STATUS } from "@/lib/status";
import type { ProjectReference } from "@/lib/db/schema";

export function ReferencesPanel({
  projectId,
  clientVisible,
  references,
}: {
  projectId: string;
  clientVisible: boolean;
  references: ProjectReference[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(clientVisible);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    setError(null);
    const res = await sendReferenceAction(projectId, { url, title, note, notify: notify && clientVisible });
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
    }, 400);
  }

  return (
    <div className="space-y-4">
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
        <div className="flex items-center justify-between gap-3">
          {clientVisible ? (
            <div className="flex items-center gap-2">
              <Switch id="ref-notify" checked={notify} onCheckedChange={setNotify} />
              <Label htmlFor="ref-notify" className="text-xs font-normal text-white/70">
                Email the client
              </Label>
            </div>
          ) : (
            <span className="text-xs text-white/40">This project is hidden from the client portal.</span>
          )}
          <SubmitButton state={state} size="sm" pendingLabel="Sending…" successLabel="Sent" disabled={!url.trim() && !note.trim()}>
            <Send /> Send reference
          </SubmitButton>
        </div>
      </form>

      {references.length === 0 ? (
        <EmptyState compact icon={Link2} title="No references yet" description="Share links or notes for the client to review." />
      ) : (
        <ul className="divide-y divide-white/5">
          {references.map((r) => (
            <li key={r.id} className="group flex items-start gap-3 py-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                {r.faviconUrl ? (
                  <img src={r.faviconUrl} alt="" width={16} height={16} className="size-4" loading="lazy" />
                ) : r.kind === "link" ? (
                  <Link2 className="size-3.5 text-white/40" />
                ) : (
                  <StickyNote className="size-3.5 text-white/40" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium text-white hover:text-accent">
                      {r.title}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-white">{r.title}</p>
                  )}
                  {statusBadgeFor(REFERENCE_STATUS, r.status)}
                </div>
                {r.note && <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-white/50">{r.note}</p>}
                {r.responseNote && (
                  <p className="mt-1 whitespace-pre-wrap rounded-lg border border-accent/15 bg-accent/5 px-2.5 py-1.5 text-xs leading-5 text-white/70">
                    <span className="text-white/40">Client says: </span>
                    {r.responseNote}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-white/30">
                  Sent {formatDateTime(r.createdAt)}
                  {r.respondedAt ? ` · responded ${formatDateTime(r.respondedAt)}` : ""}
                </p>
              </div>
              <ActionButton
                variant="ghost"
                size="icon-sm"
                aria-label="Delete reference"
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
                action={deleteReferenceAction.bind(null, projectId, r.id)}
                confirm={{ title: "Delete this reference?", description: "It will disappear from the client's portal.", confirmLabel: "Delete", destructive: true }}
              >
                <Trash2 />
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
