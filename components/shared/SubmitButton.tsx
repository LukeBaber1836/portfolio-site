"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";
import { SuccessCheck } from "@/components/shared/SuccessCheck";
import { cn } from "@/lib/utils";

type State = "idle" | "pending" | "success";

/**
 * Spinner ↔ check morph (transitions.dev "Icon swap" + "Success check").
 * Pass `state` for manual control; otherwise it follows the parent form's pending status.
 */
export function SubmitButton({
  children,
  state,
  pendingLabel,
  successLabel,
  className,
  ...props
}: ButtonProps & { state?: State; pendingLabel?: string; successLabel?: string }) {
  const { pending } = useFormStatus();
  const current: State = state ?? (pending ? "pending" : "idle");
  const showIcon = current !== "idle";

  return (
    <Button
      type="submit"
      disabled={current === "pending" || props.disabled}
      aria-busy={current === "pending"}
      className={cn("min-w-32", className)}
      {...props}
    >
      <span
        className="t-icon-swap overflow-hidden transition-[width] duration-200"
        data-state={current === "success" ? "b" : "a"}
        style={{ width: showIcon ? 16 : 0 }}
        aria-hidden
      >
        <span className="t-icon flex" data-icon="a">
          <Loader2 className="size-4 animate-spin" />
        </span>
        <span className="t-icon flex" data-icon="b">
          {current === "success" && <SuccessCheck className="size-4" />}
        </span>
      </span>
      <span className="inline-flex items-center gap-2">
        {current === "pending" && pendingLabel ? pendingLabel : current === "success" && successLabel ? successLabel : children}
      </span>
    </Button>
  );
}
