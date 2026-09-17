"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fieldInputClass } from "@/components/shared/FormField";
import { cn } from "@/lib/utils";

export type ProjectOption = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  clientCompany: string | null;
  lastLoggedAt?: string | Date | null;
};

/** Searchable client → project combobox (recently-logged projects first). */
export function ProjectPicker({
  projects,
  value,
  onChange,
  placeholder = "Choose a project…",
  id,
}: {
  projects: ProjectOption[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = projects.find((p) => p.id === value);

  const { recent, byClient } = useMemo(() => {
    const recent = projects.filter((p) => p.lastLoggedAt).slice(0, 3);
    const byClient = new Map<string, ProjectOption[]>();
    for (const p of projects) {
      const key = p.clientCompany || p.clientName;
      byClient.set(key, [...(byClient.get(key) ?? []), p]);
    }
    return { recent, byClient: [...byClient.entries()].sort(([a], [b]) => a.localeCompare(b)) };
  }, [projects]);

  const item = (p: ProjectOption, prefix: string) => (
    <CommandItem
      key={`${prefix}-${p.id}`}
      value={`${prefix} ${p.name} ${p.clientName} ${p.clientCompany ?? ""} ${p.id}`}
      onSelect={() => {
        onChange(p.id);
        setOpen(false);
      }}
      className="cursor-pointer rounded-lg py-2 data-[selected=true]:bg-white/5 data-[selected=true]:text-accent"
    >
      <Check className={cn("size-4", value === p.id ? "opacity-100 text-accent" : "opacity-0")} />
      <span className="min-w-0 flex-1 truncate">{p.name}</span>
      <span className="truncate text-xs text-white/40">{p.clientCompany || p.clientName}</span>
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(fieldInputClass, "cursor-pointer items-center justify-between gap-2 text-left")}
        >
          {selected ? (
            <span className="min-w-0 truncate">
              {selected.name} <span className="text-white/40">· {selected.clientCompany || selected.clientName}</span>
            </span>
          ) : (
            <span className="text-white/35">{placeholder}</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-white/40" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 rounded-xl border-white/10 bg-popover p-0" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search projects or clients…" />
          <CommandList className="max-h-72">
            <CommandEmpty className="py-6 text-center text-sm text-white/50">No active projects match.</CommandEmpty>
            {recent.length > 0 && (
              <CommandGroup heading="Recent">{recent.map((p) => item(p, "recent"))}</CommandGroup>
            )}
            {byClient.map(([client, list]) => (
              <CommandGroup key={client} heading={client}>
                {list.map((p) => item(p, "all"))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
