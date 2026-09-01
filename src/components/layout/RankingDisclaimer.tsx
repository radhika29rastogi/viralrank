import { ColorBlock } from "@/components/system";
import { RANKING_INDEPENDENCE_DISCLAIMER } from "@/lib/copy/platform";

export function RankingDisclaimer() {
  return (
    <ColorBlock color="cream" padding="md">
      <p className="text-sm font-medium text-neutral-600">{RANKING_INDEPENDENCE_DISCLAIMER}</p>
    </ColorBlock>
  );
}
