import {
  ChartBarIcon,
  EyeIcon,
  FireIcon,
  GlobeAltIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import { Badge, ColorBlock, DisplayHeadline } from "@/components/system";
import { formatCompactInr, formatNumber } from "@/lib/format";
import { formatCompactCount } from "@/lib/creator-stats";
import type { LiveStats } from "@/types/live";

type Metric = {
  label: string;
  value: string;
  hint: string;
  icon: typeof FireIcon;
  color: "pink" | "yellow" | "blue" | "lime" | "purple";
};

export function HomeAnalytics({ stats }: { stats: LiveStats }) {
  const metrics: Metric[] = [
    {
      label: "Creators",
      value: formatNumber(stats.creatorCount),
      hint: "Paid, active listings",
      icon: UserGroupIcon,
      color: "pink",
    },
    {
      label: "Rankings",
      value: formatNumber(stats.rankedCount),
      hint: "Creators with a live rank",
      icon: TrophyIcon,
      color: "yellow",
    },
    {
      label: "Hype",
      value: formatCompactCount(stats.totalHype),
      hint: "Verified hype count",
      icon: FireIcon,
      color: "lime",
    },
    {
      label: "Profile views",
      value: formatNumber(stats.profileViews),
      hint: "Clicks on listed profiles",
      icon: EyeIcon,
      color: "blue",
    },
    {
      label: "Moved this week",
      value: formatCompactInr(stats.movedThisWeek),
      hint: "Verified bids + hype",
      icon: ChartBarIcon,
      color: "purple",
    },
    {
      label: "Visitors",
      value: stats.visitors == null ? "Coming soon" : formatNumber(stats.visitors),
      hint: "Site traffic is not tracked yet",
      icon: GlobeAltIcon,
      color: "blue",
    },
  ];

  return (
    <section className="space-y-8 py-4" data-analytics="home_analytics">
      <div className="text-center">
        <Badge color="blue" icon="📊">
          Analytics
        </Badge>
        <DisplayHeadline as="h2" align="center" size="md" className="mt-4" accent="Analytics">
          Live Analytics
        </DisplayHeadline>
        <p className="mt-3 text-muted-foreground">
          Real platform numbers only. Unavailable metrics stay as Coming soon.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <ColorBlock key={metric.label} color={metric.color} padding="md">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-extrabold uppercase tracking-wide text-on-accent/70">
                  {metric.label}
                </p>
                <Icon className="size-5 text-on-accent" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-on-accent">{metric.value}</p>
              <p className="mt-1 text-xs font-semibold text-on-accent/70">{metric.hint}</p>
            </ColorBlock>
          );
        })}
      </div>
    </section>
  );
}
