import { Badge, BoldButton, ColorBlock, DisplayHeadline } from "@/components/system";

export function ClosingCta() {
  return (
    <section className="relative py-8">
      <Badge color="yellow" rotate={-3} className="absolute -top-2 left-4 sm:left-12">
        Submit
      </Badge>
      <Badge color="blue" rotate={3} className="absolute -top-2 right-4 sm:right-16">
        Hype
      </Badge>
      <Badge color="lime" rotate={-2} className="absolute -bottom-2 left-8 sm:left-24">
        Rank
      </Badge>
      <Badge color="purple" rotate={2} className="absolute right-10 -bottom-2 sm:right-28">
        Go viral
      </Badge>
      <ColorBlock color="pink" className="px-6 py-16 text-center">
        <DisplayHeadline as="h2" align="center" invert size="md">
          Ready to take #1? 🔥
        </DisplayHeadline>
        <p className="mx-auto mt-4 max-w-lg text-cream/90">
          Creators compete for attention. You decide who gets the hype.
        </p>
        <div className="mt-8 flex justify-center">
          <BoldButton href="/submit" color="yellow" size="lg">
            Rank a Creator
          </BoldButton>
        </div>
      </ColorBlock>
    </section>
  );
}
