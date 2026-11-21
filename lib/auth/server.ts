import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";
import { env } from "@/lib/env";

type NeonAuth = ReturnType<typeof createNeonAuth>;

function create(): NeonAuth {
  return createNeonAuth({
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookies: {
      secret: env.NEON_AUTH_COOKIE_SECRET,
      // Lax so the session survives the redirect back from Google / Stripe.
      sameSite: "lax",
    },
  });
}

// Created on first use so `next build` can collect pages without auth secrets present.
let instance: NeonAuth | undefined;

export const auth = new Proxy({} as NeonAuth, {
  get(_, key) {
    instance ??= create();
    const value = Reflect.get(instance, key);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
