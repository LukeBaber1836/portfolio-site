"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

import { saveMilestoneAction } from "@/app/admin/_actions/projects";
import { DatePicker } from "@/components/shared/DatePicker";
import { FormField, TextInput } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function MilestoneDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    const res = await saveMilestoneAction(projectId, null, { title, dueDate });
    if (!res.ok) {
      setState("idle");
      setError(res.fieldErrors?.title ?? res.error);
      setErrorKey((k) => k + 1);
      return;
    }
    setState("success");
    setTimeout(() => {
      setTitle("");
      setDueDate("");
      setError(null);
      setState("idle");
      setOpen(false);
      router.refresh();
    }, 400);
  }

  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label="Add milestone" onClick={() => setOpen(true)} className="hover:text-accent">
        <Plus />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add milestone</DialogTitle>
            <DialogDescription className="text-white/50">A checkpoint the client can follow on their project page.</DialogDescription>
          </DialogHeader>
          <form onSubmit={add} className="space-y-4">
            <FormField label="Milestone" htmlFor="ms-title" error={error} errorKey={errorKey}>
              <TextInput id="ms-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Staging site review" />
            </FormField>
            <FormField label="Due date" htmlFor="ms-due" optional>
              <DatePicker id="ms-due" value={dueDate} onChange={setDueDate} />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <SubmitButton state={state} size="sm" className="min-w-0" successLabel="Added">
                Add milestone
              </SubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
