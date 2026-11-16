import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/status";

const badgeVariants = cva(
  "inline-flex h-5 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium transition-colors [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "gold-brushed text-background",
        secondary: "bg-white/[0.06] text-fg-2",
        destructive: "bg-danger/10 text-danger",
        outline: "border border-line-strong text-fg-2",
        // Status tones: neutral chip; the colour rides on a 6px dot (see StatusBadge).
        info: "bg-white/[0.05] text-fg-2",
        attention: "bg-white/[0.05] text-fg-2",
        success: "bg-white/[0.05] text-fg-2",
        danger: "bg-danger/10 text-danger",
        neutral: "bg-white/[0.05] text-fg-3",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const TONE_DOT: Record<Tone, string> = {
  info: "bg-info",
  attention: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  neutral: "bg-fg-3",
};

/**
 * Status chip: coloured dot + label (never colour alone). `icon` swaps the dot for
 * a glyph (e.g. a thumb for yes/no answers); `null` renders the label only.
 */
function StatusBadge({
  label,
  tone,
  className,
  pulse,
  icon: Icon,
}: {
  label: string;
  tone: Tone;
  className?: string;
  pulse?: boolean;
  icon?: LucideIcon | null;
}) {
  return (
    <Badge variant={tone} className={className}>
      {Icon ? (
        <Icon aria-hidden />
      ) : Icon === undefined ? (
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone], pulse && "animate-pulse")} />
      ) : null}
      {label}
    </Badge>
  );
}

function statusBadgeFor(
  map: Record<string, { label: string; tone: Tone }>,
  status: string,
  props: { className?: string; pulse?: boolean; icon?: LucideIcon } = {},
) {
  const def = map[status] ?? { label: status, tone: "neutral" as Tone };
  return <StatusBadge label={def.label} tone={def.tone} {...props} />;
}

export { Badge, StatusBadge, badgeVariants, statusBadgeFor };
