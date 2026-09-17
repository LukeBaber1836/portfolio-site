"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Brand-skinned select for forms (popover + listbox). Use for every form
 * select — native <select> renders white/blue OS chrome that breaks the theme.
 * Supports controlled (value) and uncontrolled (defaultValue) usage.
 */
export function FieldSelect({
  id,
  label,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled,
  className,
  children,
}: {
  id?: string;
  /** Accessible name when the select stands alone (RequestStatusControl pattern). */
  label?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        aria-label={label}
        className={cn(
          "h-11 text-sm text-white data-[placeholder]:text-white/35",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border-white/10 bg-popover">{children}</SelectContent>
    </Select>
  );
}

export function FieldSelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <SelectItem value={value}>{children}</SelectItem>;
}
