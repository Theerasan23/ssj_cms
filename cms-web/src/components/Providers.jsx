"use client";

import { SessionProvider } from "next-auth/react";
import { AppProvider } from "@/context/AppContext";

// next-auth/react calls its API with absolute paths, so it does not pick up the
// app's basePath on its own — point it at the route handler explicitly.
const AUTH_PATH = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/auth`;

export function Providers({ children }) {
  return (
    <SessionProvider basePath={AUTH_PATH}>
      <AppProvider>{children}</AppProvider>
    </SessionProvider>
  );
}
