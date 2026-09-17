"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { ProjectForm } from "@/components/admin/ProjectForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** URL-driven (?new=1&client=…) so dashboard/client pages can deep-link straight into it. */
export function NewProjectDialog({
  clients,
  defaultRateCents,
}: {
  clients: { id: string; name: string; company: string | null }[];
  defaultRateCents: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const open = params.get("new") === "1";

  const setOpen = (next: boolean) => {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set("new", "1");
    else {
      sp.delete("new");
      sp.delete("client");
    }
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={!clients.length}>
        <Plus /> New project
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">New project</DialogTitle>
            <DialogDescription className="text-white/50">Projects group your time, milestones, and updates for a client.</DialogDescription>
          </DialogHeader>
          <ProjectForm clients={clients} defaultClientId={params.get("client") ?? undefined} defaultRateCents={defaultRateCents} />
        </DialogContent>
      </Dialog>
    </>
  );
}
