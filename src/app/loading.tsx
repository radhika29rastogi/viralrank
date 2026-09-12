import { ColorBlock } from "@/components/system";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <ColorBlock color="cream" className="py-16 text-center">
        <p className="font-extrabold text-foreground">Loading…</p>
      </ColorBlock>
    </div>
  );
}
