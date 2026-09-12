"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  if (!mounted) {
    return <Button variant="outline" size="icon" aria-label="Toggle theme" className="border-2 border-border bg-card text-foreground" />;
  }

  const dark = theme === "dark";
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="border-2 border-border bg-card text-foreground"
    >
      {dark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
    </Button>
  );
}
