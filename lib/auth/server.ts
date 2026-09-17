import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";
import { env } from "@/lib/env";

export const auth = createNeonAuth({
  baseUrl: env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: env.NEON_AUTH_COOKIE_SECRET,
    // Lax so the session survives the redirect back from Google / Stripe.
    sameSite: "lax",
  },
});
