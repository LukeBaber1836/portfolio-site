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
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Send /> Post update
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Post an update</DialogTitle>
            <DialogDescription>Appears on the client&apos;s project page.</DialogDescription>
          </DialogHeader>
          <UpdateComposer projectId={projectId} clientVisible={clientVisible} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
