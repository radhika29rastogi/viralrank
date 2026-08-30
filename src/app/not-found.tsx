import { ColorBlock, DisplayHeadline } from "@/components/system";
import { BoldButton } from "@/components/system";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <ColorBlock color="cream" className="text-center">
        <DisplayHeadline as="h1" size="md" align="center">
          Not found
        </DisplayHeadline>
        <p className="mt-3 font-bold text-neutral-500">No creators here yet. Be the first. 🔥</p>
        <div className="mt-6 flex justify-center">
          <BoldButton href="/submit" color="yellow">
            Rank a Creator
          </BoldButton>
        </div>
      </ColorBlock>
    </div>
  );
}
