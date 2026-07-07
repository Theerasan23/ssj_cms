"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

// Fetches all cases (client-side filtering mirrors the prototype's behaviour).
export function useAllCases() {
  const [cases, setCases] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/cases?pageSize=1000");
      setCases(r.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { cases: cases || [], loading: loading && cases === null, reload };
}
