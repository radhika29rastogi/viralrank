export type LiveStats = {
  creatorsRanked: number;
  creatorCount: number;
  rankedCount: number;
  movedThisWeek: number;
  profileViews: number;
  totalHype: number;
  visitors: number | null;
};

export type ArenaEvent = {
  id: string;
  kind: "bid" | "hype" | "join";
  username: string;
  amount?: number;
  rank?: number | null;
  created_at: string;
};
