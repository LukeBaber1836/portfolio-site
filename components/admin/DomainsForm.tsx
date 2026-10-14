"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Globe, Pencil } from "lucide-react";
import { toast } from "sonner";

import { saveProjectDomainsAction } from "@/app/admin/_actions/projects";
import { FormField, TextInput } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { hostOf } from "@/lib/references/preview";
import { cn } from "@/lib/utils";

type SiteKind = "production" | "dev";

export function DomainsForm({
  projectId,
  productionUrl,
  devUrl,
  featuredSite,
}: {
  projectId: string;
  productionUrl: string | null;
  devUrl: string | null;
  featuredSite: SiteKind;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<SiteKind, string>>({ production: productionUrl ?? "", dev: devUrl ?? "" });
  // Saved domains render as link cards; the pencil swaps one back to an input.
  const [editing, setEditing] = useState<Record<SiteKind, boolean>>({ production: !productionUrl, dev: !devUrl });
  const [featured, setFeatured] = useState<SiteKind>(featuredSite);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [errorKey, setErrorKey] = useState(0);

  const saved: Record<SiteKind, string | null> = { production: productionUrl, dev: devUrl };
  const urlsDirty = values.production.trim() !== (productionUrl ?? "") || values.dev.trim() !== (devUrl ?? "");
  const dirty = urlsDirty || featured !== featuredSite;
  // Mirrors featuredSiteOf: an empty featured domain falls back to the other one.
  const other: SiteKind = featured === "production" ? "dev" : "production";
  const effectiveFeatured = values[featured].trim() ? featured : values[other].trim() ? other : null;

  async function save(next: { production: string; dev: string; featured: SiteKind }) {
    setState("pending");
    setErrors({});
    const res = await saveProjectDomainsAction(projectId, { productionUrl: next.production, devUrl: next.dev, featuredSite: next.featured });
    if (!res.ok) {
      setState("idle");
      setErrors(res.fieldErrors ?? {});
      setErrorKey((k) => k + 1);
      if (!res.fieldErrors) toast.error(res.error);
      return;
    }
    setState("success");
    toast.success(res.message);
    setTimeout(() => {
      setState("idle");
      router.refresh();
    }, 400);
  }

  function feature(kind: SiteKind) {
    setFeatured(kind);
    // Flipping the hero is a one-click switch unless there are unsaved URL edits to bundle with it.
    if (!urlsDirty) void save({ ...values, featured: kind });
  }

  function cancelEdit(kind: SiteKind) {
    setValues((v) => ({ ...v, [kind]: saved[kind] ?? "" }));
    setEditing((e) => ({ ...e, [kind]: false }));
  }

  const rows: { kind: SiteKind; label: string; placeholder: string; errorField: string }[] = [
    { kind: "production", label: "Production", placeholder: "example.com", errorField: "productionUrl" },
    { kind: "dev", label: "Development", placeholder: "staging.example.com", errorField: "devUrl" },
  ];
  const anyEditingSaved = rows.some((r) => editing[r.kind] && saved[r.kind]);

  return (
    <TooltipProvider delayDuration={600}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save({ ...values, featured });
        }}
        className="space-y-4"
      >
        {rows.map(({ kind, label, placeholder, errorField }) => {
          const savedUrl = saved[kind];
          const isFeatured = effectiveFeatured === kind;
          const canFeature = !!values[kind].trim();
          const showCard = !!savedUrl && !editing[kind];
          return (
            <FormField key={kind} label={label} htmlFor={`domain-${kind}`} optional error={errors[errorField]} errorKey={errorKey}>
              <div className="group/row flex items-center">
                {showCard ? (
                  <a
                    href={savedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-accent/5"
                  >
                    <Globe className="size-4 shrink-0 text-white/40 group-hover:text-accent" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm text-white group-hover:text-accent">{hostOf(savedUrl)}</span>
                    {isFeatured && <Badge variant="attention">Preview</Badge>}
                    <ArrowUpRight className="size-4 shrink-0 text-white/30 group-hover:text-accent" aria-hidden />
                  </a>
                ) : (
                  <TextInput
                    id={`domain-${kind}`}
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    autoFocus={!!savedUrl}
                    value={values[kind]}
                    onChange={(e) => setValues((v) => ({ ...v, [kind]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && savedUrl) cancelEdit(kind);
                    }}
                    placeholder={placeholder}
                    className="min-w-0 flex-1"
                  />
                )}
                {/* Over a saved card the controls stay tucked away until the row is hovered or focused. */}
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-1 overflow-hidden pl-2 transition-[max-width,opacity,padding] duration-200 ease-out",
                    showCard &&
                      "max-w-0 pl-0 opacity-0 group-focus-within/row:max-w-20 group-focus-within/row:pl-2 group-focus-within/row:opacity-100 group-hover/row:max-w-20 group-hover/row:pl-2 group-hover/row:opacity-100",
                  )}
                >
                  {showCard && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditing((e) => ({ ...e, [kind]: true }))}
                          aria-label={`Edit ${label.toLowerCase()} domain`}
                          className="text-white/50 hover:text-accent"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex size-8 shrink-0 items-center justify-center">
                        <Checkbox
                          checked={isFeatured}
                          disabled={!canFeature || state === "pending"}
                          onCheckedChange={(v) => v === true && feature(kind)}
                          aria-label={`Show ${label.toLowerCase()} as the client's site preview`}
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{isFeatured ? "Shown as the client's site preview" : "Use as the client's site preview"}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </FormField>
          );
        })}
        {(urlsDirty || anyEditingSaved) && (
          <div className="flex justify-end gap-2">
            {anyEditingSaved && (
              <Button type="button" variant="ghost" size="sm" onClick={() => rows.forEach((r) => saved[r.kind] && cancelEdit(r.kind))}>
                Cancel
              </Button>
            )}
            <SubmitButton state={state} size="sm" pendingLabel="Saving…" successLabel="Saved" disabled={!dirty}>
              Save domains
            </SubmitButton>
          </div>
        )}
      </form>
    </TooltipProvider>
  );
}
