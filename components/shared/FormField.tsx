"use client";

import { useEffect, useRef } from "react";
import { Info } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const inputBase =
  "flex h-11 w-full rounded-xl border border-white/10 bg-background px-4 text-sm text-white placeholder:text-white/35 outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50";

export const fieldInputClass = inputBase;

/**
 * Label + control + message. When `error` changes to a new message, the control
 * replays the transitions.dev "Error state shake".
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  tooltip,
  children,
  className,
  optional,
  errorKey,
}: {
  label: string;
  htmlFor?: string;
  error?: string | null;
  hint?: React.ReactNode;
  /** Hint text moved into an info-icon tooltip beside the label. */
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
  optional?: boolean;
  /** Change to replay the shake even when the message is unchanged. */
  errorKey?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const input = shakeRef.current;
    if (!wrap || !input) return;
    if (!error) {
      wrap.classList.remove("is-error");
      input.classList.remove("is-error");
      return;
    }
    wrap.classList.add("is-error");
    input.classList.add("is-error");
    input.classList.remove("is-shaking");
    void input.offsetWidth; // force reflow so the shake replays
    input.classList.add("is-shaking");
    const t = setTimeout(() => input.classList.remove("is-shaking"), 300);
    return () => clearTimeout(t);
  }, [error, errorKey]);

  return (
    <div ref={wrapRef} className={cn("t-input-wrap space-y-2", className)}>
      <Label htmlFor={htmlFor} className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/60">
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`More info: ${label}`}
                className="cursor-help text-white/35 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <Info className="size-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px] border-white/10 bg-popover text-xs font-normal normal-case leading-5 tracking-normal text-white/70">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
        {optional && <span className="normal-case tracking-normal text-white/30">optional</span>}
      </Label>
      <div ref={shakeRef} className={cn("t-input rounded-xl", error && "[&_input]:border-danger [&_textarea]:border-danger [&_button[role=combobox]]:border-danger")}>
        {children}
      </div>
      {error ? (
        <p className="t-error-msg text-xs text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs leading-5 text-white/40">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(inputBase, "h-auto min-h-24 py-3 leading-6", className)} {...props} />;
}
