import CredentialsProvider from "next-auth/providers/credentials";

// authorize() runs server-side. In Docker the browser reaches the API at
// http://localhost:3022/api (NEXT_PUBLIC_API_URL) but this container must reach it
// by service name (http://api:3022/api) — hence a separate API_URL override.
const API = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3021/api";

// NextAuth (Auth.js v4) — Credentials provider that validates against cms-api.
// The cms-api JWT is carried inside the NextAuth session so client calls can use it.
export const authOptions = {
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: credentials?.username, password: credentials?.password }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          if (!data?.token || !data?.user) return null;
          return { id: String(data.user.userId), apiToken: data.token, cms: data.user };
        } catch {
          return null;
        }
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
