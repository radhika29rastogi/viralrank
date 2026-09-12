/** Calendar day in Asia/Kolkata (IST). "Today" resets at midnight IST. */

export function startOfTodayIst(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${parts}T00:00:00+05:30`);
}

export function listedAgo(iso: string | null | undefined) {
  if (!iso) return "just listed";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
