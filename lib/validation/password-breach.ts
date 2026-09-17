import "server-only";

import { createHash } from "node:crypto";
import { validatePassword, type PasswordContext, type PasswordValidation } from "./password";

/**
 * Have I Been Pwned range API (k-anonymity): only the first 5 hex chars of the
 * SHA-1 hash leave the server. Fails open (returns false) if HIBP is unreachable.
 */
export async function isBreachedPassword(password: string): Promise<boolean> {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [s, count] = line.trim().split(":");
      return s === suffix && Number(count) > 0;
    });
  } catch (err) {
    console.warn("[password] HIBP check skipped:", (err as Error).message);
    return false;
  }
}

/** Server-side policy: rules + strength + breach check. */
export async function validatePasswordServer(
  password: string,
  ctx: PasswordContext = {},
): Promise<PasswordValidation> {
  const base = await validatePassword(password, ctx);
  if (!base.ok) return base;
  if (await isBreachedPassword(password)) {
    return {
      ok: false,
      error: "This password has appeared in a known data breach. Please choose a different one.",
    };
  }
  return { ok: true };
}
