"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function VisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    void fetch("/api/visits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname || "/" }),
    });
  }, [pathname]);

  return null;
}
