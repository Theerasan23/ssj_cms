"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function Home() {
  const { booting, loggedIn } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (booting) return;
    router.replace(loggedIn ? "/dashboard" : "/login");
  }, [booting, loggedIn, router]);
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }} className="muted">
      กำลังโหลด…
    </div>
  );
}
