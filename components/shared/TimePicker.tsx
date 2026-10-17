"use client";

import { ClockIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

function parse(value: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h24 = Number(m[1]);
  return { hour: h24 % 12 === 0 ? 12 : h24 % 12, minute: Number(m[2]), pm: h24 >= 12 };
}

function toValue(hour: number, minute: number, pm: boolean) {
  const h24 = (hour % 12) + (pm ? 12 : 0);
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatTime12(value: string) {
  const p = parse(value);
  return p ? `${p.hour}:${String(p.minute).padStart(2, "0")} ${p.pm ? "PM" : "AM"}` : null;
}

/**
 * Brand-skinned time picker (popover + hour / minute / AM-PM columns) for
 * `HH:mm` string state. Pairs with `DatePicker`; replaces native `type="time"`.
 */
export function TimePicker({
  id,
  value,
  onChange,
  step = 5,
  placeholder = "Pick a time",
}: {
  id?: string;
  value: string;
  onChange: (time: string) => void;
  /** Minute increment shown in the list. An off-step current value is still listed. */
  step?: number;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = parse(value);
  const sel = current ?? { hour: 9, minute: 0, pm: false };
  const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
  // Timer-recorded entries can land off-step (e.g. 9:07); keep that value selectable.
  if (current && !minutes.includes(current.minute)) {
    minutes.push(current.minute);
    minutes.sort((a, b) => a - b);
  }

  const set = (patch: Partial<typeof sel>) => {
    const next = { ...sel, ...patch };
    onChange(toValue(next.hour, next.minute, next.pm));
  };

  return (
    // `modal` gives the popover its own scroll lock; without it a parent Dialog's lock swallows wheel/touch scrolling in the columns.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-full justify-start rounded-xl border-white/10 bg-background px-4 text-sm font-normal tabular-nums",
            current ? "text-white" : "text-white/35",
          )}
        >
          <ClockIcon className="mr-2 size-4 shrink-0 text-white/40" />
          <span className="truncate">{formatTime12(value) ?? placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto rounded-2xl border-white/10 bg-popover p-2" align="start">
        <div className="flex h-56 gap-1">
          <Column label="Hour" items={HOURS} selected={sel.hour} render={(h) => String(h)} onSelect={(hour) => set({ hour })} />
          <Column label="Minute" items={minutes} selected={sel.minute} render={(m) => String(m).padStart(2, "0")} onSelect={(minute) => set({ minute })} />
          <Column
            label="AM or PM"
            items={[false, true]}
            selected={sel.pm}
            render={(pm) => (pm ? "PM" : "AM")}
            onSelect={(pm) => set({ pm })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function centerInColumn(el: HTMLButtonElement | null) {
  const col = el?.parentElement;
  if (el && col) col.scrollTop = el.offsetTop - (col.clientHeight - el.offsetHeight) / 2;
}

function Column<T extends number | boolean>({
  label,
  items,
  selected,
  render,
  onSelect,
}: {
  label: string;
  items: T[];
  selected: T;
  render: (item: T) => string;
  onSelect: (item: T) => void;
}) {
  return (
    <div role="listbox" aria-label={label} className="relative flex w-14 snap-y snap-mandatory flex-col gap-0.5 overflow-y-auto overscroll-contain py-[5.875rem] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] [scrollbar-width:none]">
      {items.map((item) => {
        const active = item === selected;
        return (
          <button
            key={String(item)}
            type="button"
            role="option"
            aria-selected={active}
            // Center the current value in its column (without scrolling the page/dialog).
            ref={active ? centerInColumn : undefined}
            onClick={() => onSelect(item)}
            className={cn(
              "h-9 shrink-0 cursor-pointer snap-center rounded-lg text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              active
                ? "bg-gradient-to-br from-gold-d1 via-gold-l1 to-gold-d2 font-semibold text-background"
                : "text-white hover:bg-white/10",
            )}
          >
            {render(item)}
          </button>
        );
      })}
    </div>
  );
}
