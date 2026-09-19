"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { UpdateComposer } from "@/components/admin/UpdateComposer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function UpdateDialog({ projectId, clientVisible }: { projectId: string; clientVisible: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send /> Send an update
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Send an update</DialogTitle>
            <DialogDescription className="text-white/50">Posts to the client&apos;s project page, newest first.</DialogDescription>
          </DialogHeader>
          <UpdateComposer projectId={projectId} clientVisible={clientVisible} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
