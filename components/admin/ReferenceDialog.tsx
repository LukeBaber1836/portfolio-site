"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { ReferenceForm } from "@/components/admin/ReferenceForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ReferenceDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label="Create reference" onClick={() => setOpen(true)} className="size-7 text-fg-3">
        <Plus />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create reference</DialogTitle>
            <DialogDescription>A link or note the client can approve or decline.</DialogDescription>
          </DialogHeader>
          <ReferenceForm projectId={projectId} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
