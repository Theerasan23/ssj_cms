import CredentialsProvider from "next-auth/providers/credentials";
import { authCookies } from "./authCookies";

// authorize() runs server-side. In Docker the browser reaches the API at
// http://localhost:3022/api (NEXT_PUBLIC_API_URL) but this container must reach it
// by service name (http://api:3022/api) — hence a separate API_URL override.
const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3021/api";

// NextAuth (Auth.js v4) — Credentials provider that validates against cms-api.
// The cms-api JWT is carried inside the NextAuth session so client calls can use it.
export const authOptions = {
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  // must stay in sync with middleware.js — see authCookies.js
  cookies: authCookies,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        let res;
        try {
          res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: credentials?.username, password: credentials?.password }),
          });
        } catch {
          return null; // API unreachable
        }
        // Throttled or disabled account: surface the API's reason instead of letting the
        // UI blame the password. Thrown (not returned) so NextAuth carries the message.
        if (res.status === 429 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่ภายหลัง");
        }
        if (!res.ok) return null;
        const data = await res.json().catch(() => null);
        if (!data?.token || !data?.user) return null;
        return { id: String(data.user.userId), apiToken: data.token, cms: data.user };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) { token.apiToken = user.apiToken; token.cms = user.cms; }
      if (trigger === "update" && session?.cms) { token.cms = { ...token.cms, ...session.cms }; }
      return token;
    },
    async session({ session, token }) {
      session.apiToken = token.apiToken;
      session.cms = token.cms;
      return session;
    },
  },
  pages: { signIn: "/login" },
};
