"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Shell } from "@/components/shell/Shell";

export default function AppGroupLayout({ children }) {
  const { booting, loggedIn, master } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!booting && !loggedIn) router.replace("/login");
  }, [booting, loggedIn, router]);

  if (booting || !loggedIn || !master) {
    return <div className="muted" style={{ padding: 40 }}>กำลังโหลด…</div>;
  }
  return <Shell>{children}</Shell>;
}
