import { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = <T>(data: T, message?: string): ActionResult<T> => ({ ok: true, data, message });
export const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

export function fromZodError(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fail("Please fix the highlighted fields.", fieldErrors);
}

/** Errors we intend to show the user verbatim. */
export class UserError extends Error {}

/** Wrap an action body so unexpected errors become a generic message (and get logged). */
export async function runAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    // Let Next.js redirect()/notFound() propagate.
    if (err && typeof err === "object" && "digest" in err) throw err;
    if (err instanceof UserError) return fail(err.message);
    console.error("[action]", err);
    return fail("Something went wrong. Please try again.");
  }
}

/** Form helpers: empty strings become undefined so optional fields validate cleanly. */
export const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const dollarsToCents = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? v.replace(/[$,\s]/g, "") : String(v)))
  .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), "Enter a dollar amount like 50 or 49.99")
  .transform((v) => (v === "" ? undefined : Math.round(Number(v) * 100)));
