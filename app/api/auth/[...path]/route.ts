import { auth } from "@/lib/auth/server";
import { validatePasswordServer } from "@/lib/validation/password-breach";

const upstream = auth.handler();

type Ctx = { params: Promise<{ path: string[] }> };

// Accounts are invite-only: public sign-up is refused here even if it is left
// enabled on the Neon Auth branch.
const BLOCKED_PATHS = new Set(["sign-up/email"]);

// Endpoints that set a password; the body is checked against our policy first.
const PASSWORD_PATHS = new Set([
  "change-password",
  "reset-password",
  "email-otp/reset-password",
  "email-otp/passcode",
]);

function jsonError(status: number, message: string, code: string) {
  return Response.json({ message, code }, { status });
}

async function guard(request: Request, ctx: Ctx) {
  const path = (await ctx.params).path.join("/");

  if (BLOCKED_PATHS.has(path)) {
    return jsonError(403, "Accounts are created by invitation only.", "SIGN_UP_DISABLED");
  }

  if (request.method === "POST" && PASSWORD_PATHS.has(path)) {
    const raw = await request.text();
    let body: Record<string, unknown> = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return jsonError(400, "Invalid request body.", "INVALID_BODY");
    }
    const password = (body.newPassword ?? body.password) as string | undefined;
    if (typeof password === "string") {
      const result = await validatePasswordServer(password, {
        email: typeof body.email === "string" ? body.email : undefined,
      });
      if (!result.ok) return jsonError(400, result.error, "PASSWORD_POLICY");
    }
    // The original body stream was consumed, so forward a rebuilt request.
    const forwarded = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: raw,
    });
    return upstream.POST(forwarded, ctx);
  }

  const method = request.method as keyof typeof upstream;
  return upstream[method](request, ctx);
}

export { guard as GET, guard as POST, guard as PUT, guard as DELETE, guard as PATCH };
