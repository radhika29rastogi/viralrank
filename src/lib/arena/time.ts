/** Calendar day in Asia/Kolkata (IST). "Today" rankings reset at midnight IST. */

export function istCalendarDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function startOfTodayIst(now = new Date()) {
  return new Date(`${istCalendarDate(now)}T00:00:00+05:30`);
}

/** 20:00 IST on the IST calendar date of `now`. */
export function istEightPm(now = new Date()) {
  return new Date(`${istCalendarDate(now)}T20:00:00+05:30`);
}

/** Most recently reached 20:00 IST cutoff (today's 8pm if that time has passed, else yesterday's). */
export function latestBattleCutoff(now = new Date()) {
  const todayEight = istEightPm(now);
  if (now.getTime() >= todayEight.getTime()) return todayEight;
  return new Date(todayEight.getTime() - 24 * 60 * 60 * 1000);
}

export function isPastEightPmIst(now = new Date()) {
  return now.getTime() >= istEightPm(now).getTime();
}

export function listedAgo(iso: string | null | undefined) {
  if (!iso) return "just listed";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
