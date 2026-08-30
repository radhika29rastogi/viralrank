import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { formatInr } from "@/lib/format";
import { getCurrentUser, getDashboardData } from "@/lib/queries";
import { minOvertakeAmount } from "@/lib/ranking";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getDashboardData(user.id);
  const primary = data.creators[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <DisplayHeadline size="md">Dashboard</DisplayHeadline>
        <SignOutButton />
      </div>
      {!primary ? (
        <ColorBlock color="cream" className="py-12 text-center">
          <p className="font-extrabold">You have not added a creator yet.</p>
        </ColorBlock>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat color="yellow" label="Rank" value={primary.current_rank ? `#${primary.current_rank}` : "—"} />
          <Stat color="pink" label="Highest bid" value={formatInr(Number(primary.current_highest_bid) || 0)} />
          <Stat color="blue" label="Price to beat" value={formatInr(minOvertakeAmount(Number(primary.current_highest_bid) || 0))} />
          <Stat color="lime" label="Clicks" value={String(primary.profile_clicks)} />
          <Stat color="cream" label="Hype count" value={String(primary.hype_count)} />
          <Stat color="cream" label="Total hype" value={formatInr(Number(primary.total_hype_amount) || 0)} />
          <Stat color="cream" label="Followers" value={primary.followers == null ? "—" : String(primary.followers)} />
          <Stat color="cream" label="Avg views" value={primary.average_views == null ? "—" : String(primary.average_views)} />
        </section>
      )}
      <div className="grid gap-8 md:grid-cols-2">
        <PaymentList title="Recent ranking payments" rows={data.bids} empty="No ranking payments yet." />
        <PaymentList title="Recent hype payments" rows={data.hypes} empty="No hype yet. Be the first. 🔥" />
      </div>
      <ColorBlock color="cream" padding="lg">
        <h2 className="text-2xl font-extrabold text-black">Rank history</h2>
        {!data.history.length ? (
          <p className="mt-2 text-neutral-500">No rank changes yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.history.map((row) => (
              <li key={`${row.creator_id}-${row.created_at}`} className="text-sm font-bold text-black">
                #{row.rank ?? "—"} · {formatInr(Number(row.highest_bid) || 0)} · {new Date(row.created_at).toLocaleString("en-IN")}
              </li>
            ))}
          </ul>
        )}
      </ColorBlock>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "yellow" | "pink" | "blue" | "lime" | "cream";
}) {
  return (
    <ColorBlock color={color} padding="md">
      <p className="text-xs font-extrabold uppercase text-black">{label}</p>
      <p className="text-2xl font-extrabold text-black">{value}</p>
    </ColorBlock>
  );
}

function PaymentList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ id: string; amount: number; payment_status: string; is_verified: boolean; created_at: string }>;
  empty: string;
}) {
  return (
    <ColorBlock color="cream" padding="lg">
      <h2 className="text-2xl font-extrabold text-black">{title}</h2>
      {!rows.length ? (
        <p className="mt-2 text-neutral-500">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="text-sm font-bold text-black">
              {formatInr(Number(row.amount))} · {row.is_verified ? "verified" : row.payment_status} ·{" "}
              {new Date(row.created_at).toLocaleString("en-IN")}
            </li>
          ))}
        </ul>
      )}
    </ColorBlock>
  );
}
