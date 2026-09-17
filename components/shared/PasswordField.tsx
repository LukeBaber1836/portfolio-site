"use client";

import { useEffect, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { FormField, fieldInputClass } from "@/components/shared/FormField";
import { cn } from "@/lib/utils";
import {
  MIN_STRENGTH_SCORE,
  checkPasswordRules,
  passwordStrength,
  type PasswordContext,
} from "@/lib/validation/password";

const STRENGTH = [
  { label: "Very weak", className: "bg-danger" },
  { label: "Weak", className: "bg-danger" },
  { label: "Fair", className: "bg-accent/70" },
  { label: "Strong", className: "bg-success" },
  { label: "Very strong", className: "bg-success" },
];

/** Password input with show/hide and a strength meter. Policy failures surface as a form error on submit. */
export function PasswordField({
  name,
  label = "Password",
  value,
  onChange,
  context,
  error,
  autoComplete = "new-password",
  onValidityChange,
}: {
  name: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  context?: PasswordContext;
  error?: string | null;
  autoComplete?: string;
  onValidityChange?: (valid: boolean) => void;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const { ok } = checkPasswordRules(value, context);

  useEffect(() => {
    let cancelled = false;
    if (!value) return;
    const t = setTimeout(async () => {
      const s = await passwordStrength(value, context);
      if (!cancelled) {
        setScore(s.score);
        setWarning(s.warning);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, context]);

  // An empty field has no score, whatever the last async result was.
  const effectiveScore = value ? score : null;
  const strongEnough = effectiveScore !== null && effectiveScore >= MIN_STRENGTH_SCORE;
  useEffect(() => {
    onValidityChange?.(ok && strongEnough);
  }, [ok, strongEnough, onValidityChange]);

  return (
    <FormField label={label} htmlFor={id} error={error}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(fieldInputClass, "pr-12")}
          aria-describedby={`${id}-strength`}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/5 hover:text-accent"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <span className="t-icon-swap" data-state={visible ? "b" : "a"}>
            <span className="t-icon" data-icon="a">
              <Eye className="size-4" />
            </span>
            <span className="t-icon" data-icon="b">
              <EyeOff className="size-4" />
            </span>
          </span>
        </button>
      </div>

      <div id={`${id}-strength`} className="mt-3 flex items-center gap-3" aria-live="polite">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-full flex-1 rounded-full bg-white/10 transition-colors duration-300",
                effectiveScore !== null && effectiveScore > i && STRENGTH[effectiveScore]!.className,
              )}
            />
          ))}
        </div>
        <span className="w-20 text-right text-xs text-white/50">{effectiveScore === null ? "" : STRENGTH[effectiveScore]!.label}</span>
      </div>
      {warning && value && !strongEnough && <p className="mt-2 text-xs text-accent/80">{warning}</p>}
    </FormField>
  );
}
