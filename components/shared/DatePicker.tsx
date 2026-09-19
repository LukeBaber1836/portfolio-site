"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseISODate(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  // Local noon construction avoids any UTC-midnight shift.
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Brand-skinned date picker (popover + calendar) for `yyyy-MM-dd` string
 * state. Replaces native `type="date"` inputs, which can't be styled.
 */
export function DatePicker({
  id,
  value,
  onChange,
  max,
  placeholder = "Pick a date",
}: {
  id?: string;
  value: string;
  onChange: (isoDate: string) => void;
  /** Latest selectable date (`yyyy-MM-dd`), e.g. today for backdated entries. */
  max?: string;
  placeholder?: string;
}) {
  const selected = parseISODate(value);
  const maxDate = max ? parseISODate(max) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-full justify-start rounded-xl border-white/10 bg-background px-4 text-sm font-normal",
            selected ? "text-white" : "text-white/35",
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0 text-white/40" />
          {selected ? <span className="truncate">{format(selected, "MMM d")}</span> : <span className="truncate">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto rounded-2xl border-white/10 bg-popover p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? maxDate ?? new Date()}
          disabled={maxDate ? { after: maxDate } : undefined}
          onSelect={(d) => {
            if (d) onChange(format(d, "yyyy-MM-dd"));
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
