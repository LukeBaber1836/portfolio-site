"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-fit",
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center relative items-center h-7",
        caption_label: "text-sm font-medium text-white",
        nav: "flex items-center gap-1 absolute inset-x-2 justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "text-white/60 hover:text-accent",
        ),
        button_next: cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "text-white/60 hover:text-accent"),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-[11px] font-normal text-white/40",
        week: "flex w-full mt-1",
        day: "relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button:
          "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg p-0 font-normal text-white transition-colors outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent/50 aria-selected:opacity-100",
        range_start: "",
        range_end: "",
        range_middle: "",
        selected:
          "bg-gradient-to-br from-gold-d1 via-gold-l1 to-gold-d2 text-background hover:from-gold-d1 hover:via-gold-l1 hover:to-gold-d2 hover:text-background focus:bg-gradient-to-br focus:text-background",
        today: "text-accent font-semibold",
        outside: "text-white/25 aria-selected:text-white/25",
        disabled: "text-white/25 opacity-50 cursor-not-allowed hover:bg-transparent",
        hidden: "invisible",
        chevron: "size-4 fill-white/60",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
