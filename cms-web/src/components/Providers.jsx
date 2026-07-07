"use client";

import { SessionProvider } from "next-auth/react";
import { AppProvider } from "@/context/AppContext";

export function Providers({ children }) {
  return (
    <SessionProvider>
      <AppProvider>{children}</AppProvider>
    </SessionProvider>
  );
}
