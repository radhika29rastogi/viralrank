"use client";

import { useEffect } from "react";

export function TrackProfileClick({ creatorId }: { creatorId: string }) {
  useEffect(() => {
    void fetch("/api/profile-clicks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });
  }, [creatorId]);
  return null;
}
