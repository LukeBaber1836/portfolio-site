"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[22px] w-[37px] shrink-0 cursor-pointer items-center rounded-full border border-transparent p-[3px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=unchecked]:bg-white/15",
        "data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-gold-d1 data-[state=checked]:via-gold-l1 data-[state=checked]:to-gold-d2",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "block size-4 rounded-full shadow-md transition-transform",
          "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-white",
          "data-[state=checked]:translate-x-[15px] data-[state=checked]:bg-background",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
