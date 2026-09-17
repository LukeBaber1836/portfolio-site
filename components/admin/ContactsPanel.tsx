"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { addContactAction, removeContactAction, resendInviteAction } from "@/app/admin/_actions/clients";
import { ActionButton } from "@/components/shared/ActionButton";
import { FormField, TextInput } from "@/components/shared/FormField";
import { StatusBadge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { initials } from "@/lib/format";

type Member = {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string | null;
  /** Relative labels are computed on the server so SSR and hydration match. */
  statusLabel: string;
};

export function ContactsPanel({ clientId, members }: { clientId: string; members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sendInvite, setSendInvite] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setState("pending");
    const res = await addContactAction(clientId, { name, email, sendInvite });
    if (!res.ok) {
      setState("idle");
      setErrors(res.fieldErrors ?? {});
      toast.error(res.error);
      return;
    }
    setState("success");
    toast.success(res.message);
    setTimeout(() => {
      setOpen(false);
      setName("");
      setEmail("");
      setState("idle");
      router.refresh();
    }, 400);
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-white/5">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-3 py-3">
            <Avatar className="size-9 border border-white/10">
              <AvatarFallback className="bg-accent/10 text-xs text-accent">{initials(m.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">
                {m.name} {m.role === "owner" && <span className="text-xs text-white/35">· primary</span>}
              </p>
              <p className="truncate text-xs text-white/40">{m.email}</p>
            </div>
            <StatusBadge tone={m.joinedAt ? "success" : "attention"} label={m.statusLabel} />
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                title="See the portal exactly as this contact does (1 hour max)"
                onClick={async () => {
                  const { error } = await authClient.admin.impersonateUser({ userId: m.userId });
                  if (error) return toast.error("Couldn't start view-as session.");
                  router.push("/portal");
                  router.refresh();
                }}
              >
                <Eye /> View as
              </Button>
              {!m.joinedAt && (
                <ActionButton variant="ghost" size="sm" action={() => resendInviteAction(clientId, m.userId)}>
                  <Mail /> Resend
                </ActionButton>
              )}
              {members.length > 1 && (
                <ActionButton
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${m.name}`}
                  className="hover:text-danger"
                  action={() => removeContactAction(clientId, m.userId)}
                  confirm={{
                    title: `Remove ${m.name}?`,
                    description: "They'll lose portal access immediately and be signed out everywhere. Their login isn't deleted.",
                    confirmLabel: "Remove access",
                    destructive: true,
                  }}
                >
                  <Trash2 />
                </ActionButton>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus /> Add contact
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-white">Add a contact</DialogTitle>
            <DialogDescription className="text-white/50">They&apos;ll see the same projects, hours, and invoices.</DialogDescription>
          </DialogHeader>
          <form onSubmit={add} className="space-y-4">
            <FormField label="Name" htmlFor="contact-name" error={errors.name}>
              <TextInput id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </FormField>
            <FormField label="Email" htmlFor="contact-email" error={errors.email}>
              <TextInput id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </FormField>
            <div className="flex items-center gap-2">
              <Switch id="contact-invite" checked={sendInvite} onCheckedChange={setSendInvite} />
              <Label htmlFor="contact-invite" className="text-sm font-normal text-white">
                Send invite email
              </Label>
            </div>
            <div className="flex justify-end">
              <SubmitButton state={state} size="sm" pendingLabel="Adding…" successLabel="Added">
                Add contact
              </SubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
