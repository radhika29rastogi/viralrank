-- Idempotent category seed for ViralRank.buzz
-- Run in Supabase SQL Editor if migrations were not applied.
-- Matches supabase/migrations/0001_init.sql + 0013_category_niches.sql.

alter table public.categories add column if not exists icon text;

insert into public.categories (name, slug, icon) values
  ('Fashion', 'fashion', '👗'),
  ('Beauty', 'beauty', '💄'),
  ('Fitness', 'fitness', '💪'),
  ('Lifestyle', 'lifestyle', '📸'),
  ('Food', 'food', '🍔'),
  ('Travel', 'travel', '✈️'),
  ('Technology', 'technology', '📱'),
  ('Tech', 'tech', '💻'),
  ('Gaming', 'gaming', '🎮'),
  ('Education', 'education', '📚'),
  ('Finance', 'finance', '💰'),
  ('Comedy', 'comedy', '🎭'),
  ('Memes', 'memes', '😂'),
  ('Videos', 'videos', '🎬'),
  ('Music', 'music', '🎵'),
  ('Art', 'art', '🎨'),
  ('Photography', 'photography', '📷'),
  ('Business', 'business', '💼'),
  ('Digital Marketing', 'digital-marketing', '📣'),
  ('Sports', 'sports', '⚽'),
  ('Entertainment', 'entertainment', '🎪'),
  ('Health', 'health', '❤️'),
  ('Other', 'other', '✨'),
  ('Devotional', 'devotional', '🙏'),
  ('Motivation', 'motivation', '🔥'),
  ('Dance', 'dance', '💃'),
  ('Health & Wellness', 'health-wellness', '🧘'),
  ('Vlogs', 'vlogs', '📸'),
  ('Astrology', 'astrology', '🔮'),
  ('News', 'news', '📰'),
  ('Pets & Animals', 'pets-animals', '🐾'),
  ('Automobile', 'automobile', '🚗')
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon;

-- Verify:
-- select slug, name, icon from public.categories order by name;
