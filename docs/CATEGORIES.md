# Categories

ViralRank categories live in `public.categories`. The TypeScript catalog in `src/lib/categories.ts` is the single source of truth for **name, slug, and icon**. Seed SQL, auto-seed, home pills, flavor tiles, and submit/filter dropdowns all derive from that list.

## Niches (0013)

Added for Indian Instagram creator traffic, alongside the original flavor set:

| Name | Slug | Icon |
| --- | --- | --- |
| Devotional | `devotional` | 🙏 |
| Motivation | `motivation` | 🔥 |
| Dance | `dance` | 💃 |
| Health & Wellness | `health-wellness` | 🧘 |
| Vlogs | `vlogs` | 📸 |
| Astrology | `astrology` | 🔮 |
| News | `news` | 📰 |
| Sports | `sports` | ⚽ (already existed; icon filled in) |
| Pets & Animals | `pets-animals` | 🐾 |
| Automobile | `automobile` | 🚗 |

`Health` (`health`) stays as a separate older row. New listings should use **Health & Wellness**.

## Apply

1. Run `supabase/migrations/0013_category_niches.sql` (adds `categories.icon`, upserts niches).
2. Or paste `supabase/seed/categories.sql` in the SQL editor.
3. `ensureCategoriesSeeded()` now **inserts missing slugs** even when the table already has rows. `GET /api/categories` triggers that.

## UI

- **Home pills:** featured catalog slugs (icon + label), horizontally scrollable. Extra table rows (Beauty, Food, Travel, …) sit behind **More ▾** so the bar does not list every long-tail slug.
- **Claim / `/submit` / Explore / Rankings filters:** options come from `GET /api/categories` (the table), with catalog icons as fallback. Do not hardcode a second list in those forms.

## Clubs / contests

Discarded feature — no category work is required for clubs or contests.
