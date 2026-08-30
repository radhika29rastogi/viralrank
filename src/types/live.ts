export type LiveStats = {
  creatorsRanked: number;
  movedThisWeek: number;
  profileViews: number;
};

export type ArenaEvent = {
  id: string;
  kind: "bid" | "hype" | "join";
  username: string;
  amount?: number;
  rank?: number | null;
  created_at: string;
};
