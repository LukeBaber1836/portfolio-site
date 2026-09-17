import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, CircleDashed, CircleDot, Clock, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/status";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/15 text-danger",
        outline: "border-white/15 text-white/70",
        info: "border-info/30 bg-info/10 text-info",
        attention: "border-accent/30 bg-accent/10 text-accent",
        success: "border-success/30 bg-success/10 text-success",
        danger: "border-danger/30 bg-danger/10 text-danger",
        neutral: "border-white/10 bg-white/5 text-white/60",
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

const TONE_ICONS: Record<Tone, LucideIcon> = {
  info: CircleDot,
  attention: Clock,
  success: CheckCircle2,
  danger: AlertTriangle,
  neutral: CircleDashed,
};

/** Status is never conveyed by color alone — every badge carries an icon and label. */
function StatusBadge({
  label,
  tone,
  className,
  pulse,
}: {
  label: string;
  tone: Tone;
  className?: string;
  pulse?: boolean;
}) {
  const Icon = TONE_ICONS[tone];
  return (
    <Badge variant={tone} className={className}>
      <Icon aria-hidden className={cn(pulse && "animate-pulse")} />
      {label}
    </Badge>
  );
}

function statusBadgeFor(
  map: Record<string, { label: string; tone: Tone }>,
  status: string,
  props: { className?: string; pulse?: boolean } = {},
) {
  const def = map[status] ?? { label: status, tone: "neutral" as Tone };
  return <StatusBadge label={def.label} tone={def.tone} {...props} />;
}

export { Badge, StatusBadge, badgeVariants, statusBadgeFor };
