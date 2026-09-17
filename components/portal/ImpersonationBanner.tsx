"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

/** Shown while an admin is viewing the portal as a client (Better Auth impersonation, max 1h). */
export function ImpersonationBanner({ clientName, userName }: { clientName: string; userName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <div className="flex items-center justify-center gap-2 px-4 pt-3">
      <div className="flex w-fit max-w-full items-center gap-2.5 rounded-full border border-accent/40 bg-accent/[0.07] px-4 py-1.5 text-sm text-accent">
        <Eye className="size-4 shrink-0" aria-hidden />
        <span className="truncate">
          Viewing as {userName} ({clientName})
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 shrink-0 rounded-full border-accent/40 text-xs text-accent hover:border-accent hover:bg-accent/10 hover:text-accent"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await authClient.admin.stopImpersonating();
          router.replace("/admin/clients");
          router.refresh();
        }}
      >
        {pending && <Loader2 className="animate-spin" />}
        Exit
      </Button>
    </div>
  );
}
