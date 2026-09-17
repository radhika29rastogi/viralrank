export function formatCompactCount(value: number | null | undefined) {
  if (value == null) return "—";
  const n = Number(value);
  if (n >= 100000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return new Intl.NumberFormat("en-IN").format(n);
}
