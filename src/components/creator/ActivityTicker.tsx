import { Badge, ColorBlock } from "@/components/system";
import { formatInr } from "@/lib/format";

export function ActivityTicker({
  items,
}: {
  items: Array<{ name: string; amount: number; created_at: string; kind: "bid" | "hype" }>;
}) {
  const shown = items.slice(0, 4);
  if (!shown.length) return null;

  const colors = ["yellow", "pink", "blue", "lime"] as const;

  return (
    <ColorBlock color="cream" padding="md">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {shown.map((item, i) => (
          <Badge key={`${item.created_at}-${i}`} color={colors[i]} icon={item.kind === "bid" ? "🏆" : "🔥"}>
            {formatInr(item.amount)} {item.kind === "bid" ? "bid" : "hype"}
          </Badge>
        ))}
      </div>
    </ColorBlock>
  );
}
