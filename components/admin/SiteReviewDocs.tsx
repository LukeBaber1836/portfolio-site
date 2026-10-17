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
      <pre className="scrollbar-subtle overflow-x-auto rounded-xl border border-white/10 bg-background px-4 py-3 pr-12 text-xs leading-6 text-white/85">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Copy ${label}`}
        className="absolute right-2 top-2"
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
    <div className="space-y-5 text-sm leading-6 text-white/70">
      <p>
        Paste this once on every client site you build. It does nothing for normal visitors — it only switches on when the client opens the site from the
        pencil on their portal project page, then loads a toolbar for pinning comments anywhere on the page.
      </p>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-white/40">HTML snippet (before &lt;/body&gt;)</p>
        <CopyBlock code={reviewSnippet(REVIEW_SCRIPT_ORIGIN)} label="Snippet" />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-white/40">Next.js sites</p>
        <CopyBlock code={NEXT_SNIPPET(REVIEW_SCRIPT_ORIGIN)} label="Next.js snippet" />
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Checklist</p>
        <ol className="list-decimal space-y-1.5 pl-5 marker:text-accent">
          <li>
            Put the site&apos;s URL in the project&apos;s <span className="text-white">Domains</span> card. The toolbar only talks to sites listed there (plus
            localhost), and the pencil opens the <span className="text-white">featured</span> domain.
          </li>
          <li>
            Other platforms: plain HTML / Vite → <code className="text-accent">index.html</code>; WordPress, Webflow, Framer, Squarespace → the site-wide
            footer &ldquo;custom code&rdquo; field.
          </li>
          <li>
            If the site sends a Content-Security-Policy, allow <code className="text-accent">{REVIEW_SCRIPT_ORIGIN}</code> in{" "}
            <code className="text-accent">script-src</code> and <code className="text-accent">connect-src</code>, and{" "}
            <code className="text-accent">https://fonts.googleapis.com</code> / <code className="text-accent">https://fonts.gstatic.com</code> for the toolbar
            font.
          </li>
          <li>
            Check it: open the project here → <span className="text-white">Site feedback → Open site review</span>. The gold toolbar should appear at the bottom
            of the site.
          </li>
        </ol>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-white/50">
        <p>
          Review links last 12 hours and only work for that project. Comments show up on the project&apos;s{" "}
          <span className="text-white/80">Site feedback</span> card, where you can resolve or delete them — or resolve them from the toolbar itself.
        </p>
        {devOrigin && (
          <p className="mt-2">
            Testing against this dev server instead? Use <code className="text-accent">{reviewSnippet(devOrigin)}</code>
          </p>
        )}
      </div>
    </div>
  );
}
