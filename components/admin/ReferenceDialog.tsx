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
      <Button variant="ghost" size="icon-sm" aria-label="Create reference" onClick={() => setOpen(true)} className="hover:text-accent">
        <Plus />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Create reference</DialogTitle>
            <DialogDescription className="text-white/50">A link or note the client can preview, approve, or decline.</DialogDescription>
          </DialogHeader>
          <ReferenceForm projectId={projectId} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
