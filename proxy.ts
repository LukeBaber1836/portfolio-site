import { auth } from "@/lib/auth/server";

// UX-level protection only: unauthenticated visitors are sent to /login.
// Real authorization happens in layouts and the data access layer (lib/dal).
export default auth.middleware({
  loginUrl: "/login",
});

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*"],
};
