"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { setRequestStatusAction } from "@/app/admin/_actions/settings";
import { FieldSelect, FieldSelectItem } from "@/components/shared/FieldSelect";
import { REQUEST_STATUS } from "@/lib/status";

export function RequestStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <FieldSelect
      label="Request status"
      defaultValue={status}
      disabled={pending}
      className="h-9 w-36 rounded-full text-xs"
      onValueChange={(value) =>
        startTransition(async () => {
          const res = await setRequestStatusAction(id, value);
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message);
            router.refresh();
          }
        })
      }
    >
      {Object.entries(REQUEST_STATUS).map(([value, def]) => (
        <FieldSelectItem key={value} value={value}>
          {def.label}
        </FieldSelectItem>
      ))}
    </FieldSelect>
  );
}
