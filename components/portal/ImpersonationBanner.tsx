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
    <div className="flex min-h-10 items-center justify-center gap-3 border-b border-line bg-surface px-4 py-1.5 text-[13px] md:rounded-t-lg">
      <Eye className="size-4 shrink-0 text-fg-3" aria-hidden />
      <span className="min-w-0 truncate text-fg-2">
        Viewing as <span className="text-white">{userName}</span> · {clientName}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0"
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
