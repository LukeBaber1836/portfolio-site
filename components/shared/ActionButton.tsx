"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions";

type Props = Omit<ButtonProps, "onClick"> & {
  action: () => Promise<ActionResult<unknown>>;
  confirm?: { title: string; description: React.ReactNode; confirmLabel?: string; destructive?: boolean };
  onDone?: (result: ActionResult<unknown>) => void;
  refresh?: boolean;
};

/** Runs a server action with toast feedback, optional confirm dialog, and a router refresh. */
export function ActionButton({ action, confirm, onDone, refresh = true, children, ...props }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  async function run() {
    setPending(true);
    const res = await action();
    setPending(false);
    setOpen(false);
    if (res.ok) {
      if (res.message) toast.success(res.message);
      if (refresh) startTransition(() => router.refresh());
    } else {
      toast.error(res.error);
    }
    onDone?.(res);
  }

  const button = (
    <Button {...props} disabled={pending || props.disabled} onClick={confirm ? undefined : run}>
      {pending && !confirm ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );

  if (!confirm) return button;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
      <AlertDialogContent className="clay rounded-2xl border-white/10 bg-popover">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{confirm.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6 text-white/60">{confirm.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              size="sm"
              variant={confirm.destructive ? "destructive" : "default"}
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                run();
              }}
            >
              {pending && <Loader2 className="animate-spin" />}
              {confirm.confirmLabel ?? "Confirm"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
