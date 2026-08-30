"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Category, Creator, Hype, RankingBid } from "@/types/database";

export function AdminPanel({
  categories,
  initialCreators,
  initialBids,
  initialHypes,
}: {
  categories: Category[];
  initialCreators: Creator[];
  initialBids: RankingBid[];
  initialHypes: Hype[];
}) {
  const [creators, setCreators] = useState(initialCreators);
  const [bids, setBids] = useState(initialBids);
  const [hypes, setHypes] = useState(initialHypes);

  async function refresh() {
    const res = await fetch("/api/admin/creators");
    if (!res.ok) return;
    const json = (await res.json()) as {
      creators: Creator[];
      bids: RankingBid[];
      hypes: Hype[];
    };
    setCreators(json.creators);
    setBids(json.bids);
    setHypes(json.hypes);
  }

  async function patch(id: string, body: Record<string, string>) {
    await fetch("/api/admin/creators", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    await refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/creators?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-8">
      <section className="overflow-x-auto rounded-2xl border-4 border-ink">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-lemon font-black">
            <tr>
              <th className="p-3">Creator</th>
              <th className="p-3">Status</th>
              <th className="p-3">Category</th>
              <th className="p-3">Bid</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((c) => (
              <tr key={c.id} className="border-t-2 border-ink">
                <td className="p-3 font-bold">
                  {c.name}
                  <div className="text-xs">@{c.instagram_username}</div>
                </td>
                <td className="p-3">
                  <select
                    className="rounded-lg border-2 border-ink bg-cream px-2 py-1"
                    value={c.status}
                    onChange={(e) => patch(c.id, { status: e.target.value })}
                  >
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="featured">featured</option>
                  </select>
                </td>
                <td className="p-3">
                  <select
                    className="rounded-lg border-2 border-ink bg-cream px-2 py-1"
                    value={c.category_id ?? ""}
                    onChange={(e) => patch(c.id, { categoryId: e.target.value })}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">₹{Number(c.current_highest_bid).toLocaleString("en-IN")}</td>
                <td className="p-3">
                  <Button variant="destructive" size="sm" onClick={() => remove(c.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <History title="Ranking payments" rows={bids} />
        <History title="Hype payments" rows={hypes} />
      </div>
    </div>
  );
}

function History({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ id: string; amount: number; is_verified: boolean; payment_status: string }>;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-black">{title}</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border-2 border-ink bg-card px-3 py-2 text-sm font-bold">
            ₹{Number(row.amount).toLocaleString("en-IN")} · {row.is_verified ? "verified" : row.payment_status}
          </li>
        ))}
      </ul>
    </section>
  );
}
