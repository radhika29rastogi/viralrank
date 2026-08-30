import { instagramProfileUrl, parseInstagramProfileInput } from "@/lib/instagram/username";

export {
  isValidInstagramUsername,
  parseInstagramProfileInput,
} from "@/lib/instagram/username";

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatCompactInr(amount: number) {
  const n = amount || 0;
  if (n >= 100000) {
    const lakhs = n / 100000;
    return `₹${lakhs >= 10 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
  }
  if (n >= 1000) {
    return `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  }
  return formatInr(n);
}

export function normalizeInstagramUsername(input: string) {
  const parsed = parseInstagramProfileInput(input);
  if (parsed.ok) return parsed.username;
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/instagram\.com/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return "";
  return trimmed.replace(/^@/, "").replace(/\/+$/, "").toLowerCase();
}

export function instagramUrlFromUsername(username: string) {
  const normalized = normalizeInstagramUsername(username);
  return normalized ? instagramProfileUrl(normalized) : "";
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://viralrank.buzz";
}

export function timeAgo(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(delta / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
