import { withAuth } from "next-auth/middleware";

// Protect the authenticated areas; unauthenticated users are sent to /login.
export default withAuth({
  pages: { signIn: "/login" },
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
