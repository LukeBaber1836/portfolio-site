"use client";

import { useState } from "react";

import { RequestForm } from "@/components/portal/RequestForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function NewRequestDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        New request
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New request</DialogTitle>
            <DialogDescription>Tell me what you need and I&apos;ll get back to you.</DialogDescription>
          </DialogHeader>
          <RequestForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
