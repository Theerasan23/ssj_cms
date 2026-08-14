import { withAuth } from "next-auth/middleware";
import { authCookies } from "@/lib/authCookies";

// Protect the authenticated areas; unauthenticated users are sent to /login.
// `cookies` is not optional here: withAuth reads the session cookie by name, and without
// it every request would be checked against NextAuth's default name and redirected to
// /login forever. authCookies.js explains why the name has to be a build-time constant.
export default withAuth({
  pages: { signIn: "/login" },
  cookies: authCookies,
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cases/:path*",
    "/committee/:path*",
    "/fines/:path*",
    "/reports/:path*",
    "/admin/:path*",
    "/approvals/:path*",
    "/profile/:path*",
  ],
};
