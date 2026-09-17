# Live battle pairing

The homepage battle widget and `/battles` always show whoever is **#1 and #2 by live `combined_score`**. That is the same query-time `RANK()` as the main leaderboard — not the first two creators submitted, and not a stored `battles` row.

```sql
SELECT *
FROM public.creator_live_ranks
WHERE live_rank IN (1, 2)
ORDER BY live_rank, combined_score DESC, score_reached_at ASC;
```

`creator_live_ranks` already requires `status = 'active'`, `listing_payment_status = 'paid'`, and `combined_score > 0`. A listed creator with zero verified bid and zero verified hype never occupies a battle slot.

## Source of truth

| Surface | Reads |
| --- | --- |
| Homepage widget, `/battles` | `getTopTwo()` → `creator_live_ranks` live_rank 1 and 2 (30s `unstable_cache`, tag `listings`) |
| 8:00 PM IST daily winner | Same live pair at settlement time, stored in `daily_battle_results` |
| `battles` table | History log only. `sync_live_battle()` writes a new live row when the top-2 IDs change |

The daily result does **not** choose who is battling. It only scores who won that day for the current #1 vs #2.

## Empty states

- **0** creators with `combined_score > 0` → “Arena warming up”
- **1** creator with `combined_score > 0` → “Defending #1 — no challenger yet”
- **2+** → live pairing, ordered by `live_rank`

## Cache

Verified bid/hype webhooks call `revalidateTag("listings")` after score apply, so the next page load can pick up a new pair without waiting for the 30s TTL. Pairing never waits for the daily cron.
