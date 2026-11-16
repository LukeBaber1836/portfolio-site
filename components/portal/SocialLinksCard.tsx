"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { saveSocialLinksAction } from "@/app/portal/_actions";
import { SocialIcon, SocialLinkItem } from "@/components/shared/SocialLinks";
import { TextInput } from "@/components/shared/FormField";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_SOCIAL_LINKS, detectPlatform } from "@/lib/socials";

/** "new" adds a row at the end; a number edits that saved link in place. */
type Editing = number | "new" | null;

export function SocialLinksCard({ links: initial }: { links: string[] }) {
  const router = useRouter();
  const [links, setLinks] = useState(initial);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "pending" | "success">("idle");

  function open(target: Exclude<Editing, null>) {
    setEditing(target);
    setDraft(target === "new" ? "" : links[target]!);
    setError(null);
  }

  function close() {
    setEditing(null);
    setDraft("");
    setError(null);
  }

  async function persist(next: string[], message?: string) {
    setState("pending");
    setError(null);
    const res = await saveSocialLinksAction(next);
    if (!res.ok) {
      setState("idle");
      setError(res.error);
      return;
    }
    setLinks(res.data);
    setState("success");
    toast.success(message ?? res.message);
    setTimeout(() => {
      setState("idle");
      close();
      router.refresh();
    }, 400);
  }

  function submit() {
    if (editing === null) return;
    if (!draft.trim()) return setError("Paste a link to your profile");
    const next = editing === "new" ? [...links, draft.trim()] : links.map((l, i) => (i === editing ? draft.trim() : l));
    void persist(next);
  }

  function remove(index: number) {
    void persist(
      links.filter((_, i) => i !== index),
      "Link removed",
    );
  }

  const editor = (index: Exclude<Editing, null>) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-2"
    >
      <div className="relative">
        {/* Live preview of the logo we'll pair with the link. */}
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-2" aria-hidden>
          <SocialIcon url={draft} />
        </span>
        <TextInput
          type="text"
          inputMode="url"
          autoComplete="off"
          autoFocus
          aria-label={index === "new" ? "Social profile link" : `Edit ${detectPlatform(links[index]!).label} link`}
          aria-invalid={!!error}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          placeholder="instagram.com/yourbusiness"
          className="pl-10"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex items-center gap-2">
        {index !== "new" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto px-2 text-fg-3 hover:bg-danger/10 hover:text-danger"
            disabled={state === "pending"}
            onClick={() => remove(index)}
          >
            <Trash2 /> Remove
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" className={index === "new" ? "ml-auto" : undefined} onClick={close} disabled={state === "pending"}>
          Cancel
        </Button>
        <SubmitButton state={state} size="sm" className="min-w-20" pendingLabel="Saving…" successLabel="Saved">
          Save
        </SubmitButton>
      </div>
    </form>
  );

  return (
    <TooltipProvider delayDuration={600}>
      <section>
        <div className="mb-2 flex min-h-7 items-center justify-between gap-2">
          <h3 className="text-xs font-medium text-fg-2">Your socials</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Add a social link"
                  className="size-7 text-fg-3 hover:text-white"
                  disabled={editing !== null || links.length >= MAX_SOCIAL_LINKS}
                  onClick={() => open("new")}
                >
                  <Plus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add a social link</TooltipContent>
            </Tooltip>
        </div>
        {links.length === 0 && editing !== "new" ? (
          <p className="text-[13px] text-fg-3">Add your Instagram, Facebook, or others so I can link them from your site.</p>
        ) : (
            <ul className="space-y-1">
              {links.map((url, i) =>
                editing === i ? (
                  <li key={url}>{editor(i)}</li>
                ) : (
                  <li key={url} className="group/row flex items-center">
                    <SocialLinkItem url={url} />
                    {/* Pencil stays tucked away until the row is hovered or focused. */}
                    <div className="flex max-w-0 shrink-0 items-center overflow-hidden opacity-0 transition-[max-width,opacity,padding] duration-200 ease-out group-focus-within/row:max-w-10 group-focus-within/row:pl-2 group-focus-within/row:opacity-100 group-hover/row:max-w-10 group-hover/row:pl-2 group-hover/row:opacity-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => open(i)}
                            disabled={editing !== null}
                            aria-label={`Edit ${detectPlatform(url).label} link`}
                            className="text-fg-3 hover:text-white"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    </div>
                  </li>
                ),
              )}
              {editing === "new" && <li>{editor("new")}</li>}
            </ul>
        )}
      </section>
    </TooltipProvider>
  );
}
