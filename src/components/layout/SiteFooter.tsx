import Link from "next/link";
import { ColorBlock } from "@/components/system";

export function SiteFooter() {
  return (
    <footer className="mt-auto px-4 py-8">
      <ColorBlock color="yellow" padding="md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-extrabold text-black">ViralRank.buzz</p>
          <p className="text-sm text-neutral-700">Submit. Hype. Rank. Go Viral.</p>
          <nav className="flex flex-wrap gap-4 text-sm font-bold text-black" aria-label="Footer">
            <Link href="/pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/rankings">Rankings</Link>
            <Link href="/submit">Rank a Creator</Link>
          </nav>
        </div>
      </ColorBlock>
    </footer>
  );
}
