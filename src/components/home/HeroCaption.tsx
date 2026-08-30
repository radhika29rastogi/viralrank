export const HERO_CAPTIONS = [
  "No followers required. No algorithm. Just who the internet backs hardest.",
  "The arena doesn't care who you were. Only who gets backed.",
  "Attention isn't given. It's taken — in public.",
] as const;

export function HeroCaption() {
  return <p className="mt-4 text-sm text-neutral-500">{HERO_CAPTIONS[0]}</p>;
}
