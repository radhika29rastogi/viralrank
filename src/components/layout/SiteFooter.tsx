import Link from "next/link";
import { ColorBlock } from "@/components/system";

export function SiteFooter() {
  return (
    <footer className="mt-auto px-4 py-8">
      <ColorBlock color="yellow" padding="md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-extrabold text-on-accent">ViralRank.buzz</p>
          <p className="text-sm text-on-accent/80">Submit. Hype. Rank. Go Viral.</p>
          <nav className="flex flex-wrap gap-4 text-sm font-bold text-on-accent" aria-label="Footer">
            <Link href="/explore">Explore</Link>
            <Link href="/rankings">Rankings</Link>
            <Link href="/about">About</Link>
            <Link href="/rules">Rules</Link>
            <Link href="/stats">Stats</Link>
            <Link href="/submit">Claim rank</Link>
          </nav>
        </div>
      </ColorBlock>
    </footer>
  );
}
