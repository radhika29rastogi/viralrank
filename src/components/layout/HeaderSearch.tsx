"use client";

import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Hit = {
  id: string;
  instagram_username: string;
  name: string;
  profile_image_url: string | null;
};

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/creators?q=${encodeURIComponent(q)}&limit=8&sort=bid`);
      if (!res.ok) return;
      const json = (await res.json()) as { items?: Hit[] };
      setHits(json.items ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Search creators"
        onClick={() => setOpen(true)}
        className="border-2 border-border bg-card text-foreground"
      >
        <MagnifyingGlassIcon className="size-5" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24">
          <div className="w-full max-w-lg rounded-2xl border-[3px] border-border bg-card p-4 text-foreground shadow-[6px_6px_0_#000]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-extrabold">Search a handle</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close search">
                <XMarkIcon className="size-6" />
              </button>
            </div>
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="@username"
              className="border-[3px] border-border"
            />
            <ul className="mt-3 space-y-2">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={`/creator/${hit.instagram_username}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl border-2 border-border bg-input-bg px-3 py-2 font-bold text-foreground"
                  >
                    <span>@{hit.instagram_username}</span>
                    <span className="text-sm text-muted-foreground">{hit.name}</span>
                  </Link>
                </li>
              ))}
              {q && !hits.length ? (
                <li className="text-sm text-muted-foreground">No listed creators match that yet.</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
