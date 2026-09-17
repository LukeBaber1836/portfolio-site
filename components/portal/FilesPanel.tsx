"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, FolderOpen, FolderUp, UploadCloud } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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
  const FolderIcon = secondary ? FolderOpen : FolderUp;

  return (
    <Card>
      <CardContent>
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <span className="clay flex size-16 shrink-0 items-center justify-center rounded-2xl bg-background text-accent">
              <FolderIcon className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-white">{secondary ? "Browse your files" : "Secure file storage"}</h2>
              <p className="mt-1 text-sm leading-6 text-white/60">
                {secondary ? "See everything you've uploaded in your private folder at " : "Upload logos, photos, documents, or 3D model files to your private folder at "}
                <span className="text-white">{host}</span>.
              </p>
            </div>
          </div>

          {username ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-background/60 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40">Your storage username</p>
                <p className="font-mono text-white">{username}</p>
              </div>
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
                    <Copy className="size-4" />
                  </span>
                  <span className="t-icon flex" data-icon="b">
                    <Check className="size-4 text-success" />
                  </span>
                </span>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          ) : (
            <p className="mt-6 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-white/70">
              Your storage login hasn&apos;t been set up yet — send me a request and I&apos;ll create one for you.
            </p>
          )}

          <Button asChild variant={secondary ? "goldOutline" : "default"} className="mt-6 h-12 w-full sm:w-auto" effect="shineHover">
            <a href={storageUrl} target="_blank" rel="noopener noreferrer">
              {secondary ? <FolderOpen /> : <UploadCloud />} Open file storage <ExternalLink className="!size-3.5 opacity-70" />
            </a>
          </Button>
          <p className="mt-3 text-xs text-white/40">Opens in a new tab. Sign in with the storage username and password I sent you.</p>
      </CardContent>
    </Card>
  );
}
