// Shared helper for surfacing OAuth (Google/GitHub/Vercel) failures. `signIn.social()`
// and `linkSocial()` redirect the whole page away, so any failure that happens *after*
// the provider redirects back (declined consent, account-linking refused, provider
// outage) can't be caught by awaiting the call — it has to come back as a query
// param on `errorCallbackURL` and be read on the page that URL points to.

export const OAUTH_ERROR_PARAM = "oauth_error";

/** Query params Better Auth (or our own fallback) may attach to errorCallbackURL. */
export function readOAuthError(params: URLSearchParams): string | null {
  const code = params.get("error") ?? (params.has(OAUTH_ERROR_PARAM) ? "unknown" : null);
  if (!code) return null;
  const description = params.get("error_description");
  if (description) return description;

  switch (code) {
    case "unable_to_create_user":
    case "unable_to_link_account":
    case "account_not_linked":
    case "email_already_exists":
      return "That Google account's email already has a portal account that isn't linked to Google yet. Sign in with your password (use \"Forgot your password?\" if you don't have one), then connect Google from Settings.";
    case "access_denied":
      return "Google sign-in was cancelled.";
    default:
      return "Google sign-in didn't complete. Please try again, or use your email and password.";
  }
}

/** Strip the error params so a refresh/back-nav doesn't re-show the message. */
export function stripOAuthErrorParams(url: URL) {
  url.searchParams.delete(OAUTH_ERROR_PARAM);
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  return url;
}
