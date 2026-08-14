// NextAuth cookie names + scope.
//
// This app shares a host with the drive-thru site (served at "/"), which also runs
// NextAuth. With the stock names — "next-auth.session-token" at path "/" — signing in to
// one app would overwrite the other app's session cookie: basePath does NOT scope cookies.
// So the names are app-specific and the path is pinned to this app's sub-path.
//
// The NAME must be a build-time constant. middleware.js runs in the Edge runtime, where
// Next inlines process.env at BUILD time, while /api/auth/[...nextauth] runs in Node and
// reads it at RUNTIME. Deriving the name from a runtime-only variable (NEXTAUTH_URL) would
// give the two halves different names and the middleware would never find the session —
// every protected route would bounce back to /login. That is also why the "__Secure-" /
// "__Host-" prefixes are dropped; `secure` is still set on the cookie itself, and "__Host-"
// could not be used here regardless because it requires path "/".
const path = process.env.NEXT_PUBLIC_BASE_PATH || "/";
const secure = (process.env.NEXTAUTH_URL || "").startsWith("https://");
const options = { httpOnly: true, sameSite: "lax", path, secure };

// Only the cookies this app actually uses; NextAuth keeps its defaults for the rest
// (pkce/state/nonce are OAuth-only and unused by the Credentials provider).
export const authCookies = {
  sessionToken: { name: "cms.session-token", options },
  callbackUrl: { name: "cms.callback-url", options },
  csrfToken: { name: "cms.csrf-token", options },
};
