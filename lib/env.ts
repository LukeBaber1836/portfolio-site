import "server-only";

import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  NEON_AUTH_BASE_URL: z.string().url(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  RESEND_TOKEN: z.string().min(1),
  RESEND_FROM: z.string().default("Luke Baber <onboarding@resend.dev>"),
  ADMIN_EMAIL: z.string().email().default("luke.baber1@gmail.com"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().min(16).optional(),
  STORAGE_URL: z.string().url().default("https://storage.lukebaber.com"),
  // FileBrowser `portal-service` API token. Optional: portal uploads are disabled without it.
  FILEBROWSER_API_TOKEN: z.string().min(1).optional(),
  FILEBROWSER_SOURCE: z.string().min(1).default("srv"),
});

// Parsed lazily so `next build` can collect pages without every secret present.
let cached: z.infer<typeof schema> | undefined;

export const env = new Proxy({} as z.infer<typeof schema>, {
  get(_, key: string) {
    if (!cached) {
      const parsed = schema.safeParse(process.env);
      if (!parsed.success) {
        const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
        throw new Error(`Invalid or missing environment variables: ${missing}`);
      }
      cached = parsed.data;
    }
    return cached[key as keyof typeof cached];
  },
});
