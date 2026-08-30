"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BoldButton } from "@/components/system";
import { BrandLogo } from "@/components/layout/BrandLogo";

const links = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/rankings", label: "Rankings" },
  { href: "/battles", label: "Battles" },
  { href: "/creators", label: "Creators" },
  { href: "/about", label: "About" },
];

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b-[4px] border-black bg-cream">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-4 lg:px-6">
        <BrandLogo className="pr-4 sm:pr-6" />
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-bold text-black hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-8 lg:flex">
          {signedIn ? (
            <Link href="/dashboard" className="text-sm font-bold text-black hover:underline">
              Dashboard
            </Link>
          ) : (
            <Link href="/signup" className="text-sm font-bold text-black hover:underline">
              Sign Up
            </Link>
          )}
          <BoldButton href="/submit" color="yellow" className="rounded-full px-5">
            Submit & Go Viral
          </BoldButton>
        </div>
        <div className="ml-auto lg:hidden">
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
            <SheetContent side="right" className="w-full border-l-[4px] border-black bg-cream p-6">
              <SheetHeader>
                <SheetTitle className="text-left text-2xl font-extrabold">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-5" aria-label="Mobile">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-bold text-black"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                {!signedIn ? (
                  <Link href="/signup" className="text-lg font-bold text-black" onClick={() => setOpen(false)}>
                    Sign Up
                  </Link>
                ) : (
                  <Link href="/dashboard" className="text-lg font-bold text-black" onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                )}
                <BoldButton href="/submit" color="yellow" fullWidth className="rounded-full">
                  Submit & Go Viral
                </BoldButton>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
