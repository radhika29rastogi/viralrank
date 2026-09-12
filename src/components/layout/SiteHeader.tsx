"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BoldButton } from "@/components/system";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/rankings", label: "Rankings" },
  { href: "/about", label: "About" },
  { href: "/rules", label: "Rules" },
];

export function SiteHeader({ visitorsToday = 0 }: { visitorsToday?: number }) {
  const [open, setOpen] = useState(false);
  const [visitors, setVisitors] = useState(visitorsToday);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/visitors")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { visitorsToday?: number } | null) => {
        if (!cancelled && typeof json?.visitorsToday === "number") {
          setVisitors(json.visitorsToday);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b-[4px] border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-4 lg:px-6">
        <BrandLogo className="pr-2 sm:pr-4" />
        <Link
          href="/stats"
          className="hidden items-center gap-2 text-xs font-bold text-foreground sm:flex"
          data-analytics="header_live_stats"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime" />
            <span className="relative inline-flex size-2 rounded-full bg-lime" />
          </span>
          <span>
            {visitors} visitors today · stats →
          </span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-bold text-foreground hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <HeaderSearch />
          <ThemeToggle />
          <BoldButton href="/submit" color="pink" className="rounded-full px-5">
            Claim rank
          </BoldButton>
        </div>
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <HeaderSearch />
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open menu" />}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="size-6"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </SheetTrigger>
            <SheetContent side="right" className="w-full border-l-[4px] border-border bg-background p-6">
              <SheetHeader>
                <SheetTitle className="text-left text-2xl font-extrabold">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-5" aria-label="Mobile">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-bold text-foreground"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link href="/stats" className="text-lg font-bold text-foreground" onClick={() => setOpen(false)}>
                  Stats
                </Link>
                <BoldButton href="/submit" color="pink" fullWidth className="rounded-full">
                  Claim rank
                </BoldButton>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
