// Shared password policy — used by the client checklist, Server Actions, and the
// /api/auth proxy. Keep this file free of server-only imports.

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string, context: PasswordContext) => boolean;
};

export type PasswordContext = {
  email?: string | null;
  name?: string | null;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN} characters`,
    test: (p) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX,
  },
  { id: "lower", label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "A number", test: (p) => /\d/.test(p) },
  {
    id: "symbol",
    label: "A symbol (e.g. ! @ # $)",
    test: (p) => /[^A-Za-z0-9\s]/.test(p),
  },
  {
    id: "personal",
    label: "Doesn't contain your name or email",
    test: (p, ctx) => p.length > 0 && !containsPersonalInfo(p, ctx),
  },
];

function containsPersonalInfo(password: string, ctx: PasswordContext) {
  const lower = password.toLowerCase();
  const tokens = [
    ctx.email?.split("@")[0],
    ...(ctx.name?.split(/\s+/) ?? []),
  ]
    .map((t) => t?.toLowerCase().trim())
    .filter((t): t is string => !!t && t.length >= 3);
  return tokens.some((t) => lower.includes(t));
}

export function checkPasswordRules(password: string, ctx: PasswordContext = {}) {
  const results = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    passed: rule.test(password, ctx),
  }));
  return { results, ok: results.every((r) => r.passed) };
}

/** Minimum zxcvbn score (0–4) required on top of the rules above. */
export const MIN_STRENGTH_SCORE = 3;

type Zxcvbn = InstanceType<typeof import("@zxcvbn-ts/core").ZxcvbnFactory>;
let zxcvbnReady: Promise<Zxcvbn> | null = null;

// Dictionaries are large, so they're loaded lazily on first use.
async function loadZxcvbn() {
  if (!zxcvbnReady) {
    zxcvbnReady = (async () => {
      const [core, common, en] = await Promise.all([
        import("@zxcvbn-ts/core"),
        import("@zxcvbn-ts/language-common"),
        import("@zxcvbn-ts/language-en"),
      ]);
      return new core.ZxcvbnFactory({
        dictionary: { ...common.dictionary, ...en.dictionary },
        graphs: common.adjacencyGraphs,
        translations: en.translations,
      });
    })();
  }
  return zxcvbnReady;
}

export async function passwordStrength(password: string, ctx: PasswordContext = {}) {
  const zxcvbn = await loadZxcvbn();
  const userInputs = [ctx.email ?? "", ctx.name ?? "", "luke", "baber", "portal"].filter(Boolean);
  const result = await zxcvbn.checkAsync(password, userInputs);
  return {
    score: result.score as 0 | 1 | 2 | 3 | 4,
    warning: result.feedback.warning || null,
    suggestions: result.feedback.suggestions,
  };
}

export type PasswordValidation =
  | { ok: true }
  | { ok: false; error: string };

/** Full policy check (rules + strength). Breach check lives in password-breach.ts (server). */
export async function validatePassword(
  password: string,
  ctx: PasswordContext = {},
): Promise<PasswordValidation> {
  const { results, ok } = checkPasswordRules(password, ctx);
  if (!ok) {
    const failed = results.filter((r) => !r.passed).map((r) => r.label.toLowerCase());
    return { ok: false, error: `Password needs: ${failed.join(", ")}.` };
  }
  const { score, warning } = await passwordStrength(password, ctx);
  if (score < MIN_STRENGTH_SCORE) {
    return {
      ok: false,
      error: warning
        ? `Password is too easy to guess: ${warning}`
        : "Password is too easy to guess. Try a longer passphrase.",
    };
  }
  return { ok: true };
}
