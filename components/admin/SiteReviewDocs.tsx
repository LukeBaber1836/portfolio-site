"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

// Production origin is hard-coded on purpose: lukebaber.com 307s to www, and the toolbar's API
// calls (CORS) can't follow a redirect — the snippet must point at the canonical host.
export const REVIEW_SCRIPT_ORIGIN = "https://www.lukebaber.com";

export const reviewSnippet = (origin: string) => `<script async src="${origin}/review/loader.js"></script>`;

function CopyBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative">
      <pre className="scrollbar-subtle overflow-x-auto rounded-md border border-line bg-sunken px-3 py-2.5 pr-11 text-xs leading-6 text-white">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Copy ${label}`}
        className="absolute right-1.5 top-1.5 size-7"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          toast.success(`${label} copied`);
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
      </Button>
    </div>
  );
}

const NEXT_SNIPPET = (origin: string) => `// app/layout.tsx
import Script from "next/script";

// inside <body>, after {children}:
<Script src="${origin}/review/loader.js" strategy="afterInteractive" />`;

/** Settings → "Site review toolbar": the snippet to paste on every client site, and how. */
export function SiteReviewDocs({ devOrigin }: { devOrigin: string | null }) {
  return (
    <div className="space-y-5 text-[13px] leading-6 text-fg-2">
      <p>
        Paste once on every client site. It stays dormant for normal visitors and only loads the comment toolbar when the client opens the site from
        their portal.
      </p>

      <div className="space-y-2">
        <p className="text-xs font-medium text-fg-2">HTML (before &lt;/body&gt;)</p>
        <CopyBlock code={reviewSnippet(REVIEW_SCRIPT_ORIGIN)} label="Snippet" />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-fg-2">Next.js</p>
        <CopyBlock code={NEXT_SNIPPET(REVIEW_SCRIPT_ORIGIN)} label="Next.js snippet" />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-fg-2">Checklist</p>
        <ol className="list-decimal space-y-1.5 pl-5 marker:text-fg-3">
          <li>
            Put the site&apos;s URL in the project&apos;s <span className="text-white">Domains</span> card. The toolbar only talks to sites listed there (plus
            localhost), and the pencil opens the <span className="text-white">featured</span> domain.
          </li>
          <li>
            Other platforms: plain HTML / Vite → <code className="text-white">index.html</code>; WordPress, Webflow, Framer, Squarespace → the site-wide
            footer &ldquo;custom code&rdquo; field.
          </li>
          <li>
            If the site sends a Content-Security-Policy, allow <code className="text-white">{REVIEW_SCRIPT_ORIGIN}</code> in{" "}
            <code className="text-white">script-src</code> and <code className="text-white">connect-src</code>, and{" "}
            <code className="text-white">https://fonts.googleapis.com</code> / <code className="text-white">https://fonts.gstatic.com</code> for the toolbar
            font.
          </li>
          <li>
            Check it: open the project here → <span className="text-white">Site feedback → Open site review</span>. The toolbar should appear at the bottom
            of the site.
          </li>
        </ol>
      </div>

      <div className="rounded-md border border-line px-3 py-2.5 text-xs leading-5 text-fg-3">
        <p>
          Review links last 12 hours and only work for that project. Comments show up on the project&apos;s{" "}
          <span className="text-fg-2">Site feedback</span> card, where you can resolve or delete them — or resolve them from the toolbar itself.
        </p>
        {devOrigin && (
          <p className="mt-2">
            Testing against this dev server instead? Use <code className="text-white">{reviewSnippet(devOrigin)}</code>
          </p>
        )}
      </div>
    </div>
  );
}
