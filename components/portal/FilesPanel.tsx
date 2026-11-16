"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Link out to FileBrowser. `secondary` = shown under the upload dropbox for clients with their own login. */
export function FilesPanel({
  storageUrl,
  username,
  host,
  secondary = false,
}: {
  storageUrl: string;
  username: string | null;
  host: string;
  secondary?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">{secondary ? "Browse your files" : "Your file storage"}</h2>
          <p className="mt-1 text-[13px] leading-5 text-fg-2">
            {secondary ? "Everything you've uploaded, in your private folder at " : "Upload logos, photos, documents, or 3D model files to your private folder at "}
            <span className="text-white">{host}</span>.
          </p>
        </div>
        <Button asChild variant={secondary ? "outline" : "default"} className="shrink-0">
          <a href={storageUrl} target="_blank" rel="noopener noreferrer">
            Open file storage <ExternalLink className="opacity-70" />
          </a>
        </Button>
      </div>

      <div className="border-t border-line px-4 py-3">
        {username ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-fg-2">
              Sign in as <span className="text-white">{username}</span> with the password I sent you.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(username);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <span className="t-icon-swap" data-state={copied ? "b" : "a"}>
                <span className="t-icon flex" data-icon="a">
                  <Copy className="size-3.5" />
                </span>
                <span className="t-icon flex" data-icon="b">
                  <Check className="size-3.5 text-success" />
                </span>
              </span>
              {copied ? "Copied" : "Copy username"}
            </Button>
          </div>
        ) : (
          <p className="text-[13px] text-fg-2">Your storage login isn&apos;t set up yet. Send me a request and I&apos;ll create one for you.</p>
        )}
      </div>
    </section>
  );
}
