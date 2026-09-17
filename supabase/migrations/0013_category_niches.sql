-- Add icon column and Indian-creator niches used on the home pills + submit forms.
-- Sports already exists from 0001; ON CONFLICT keeps that row and fills icon.

alter table public.categories
  add column if not exists icon text;

update public.categories set icon = '😂' where slug = 'memes' and icon is null;
update public.categories set icon = '🎬' where slug = 'videos' and icon is null;
update public.categories set icon = '🎵' where slug = 'music' and icon is null;
update public.categories set icon = '🎨' where slug = 'art' and icon is null;
update public.categories set icon = '🎮' where slug = 'gaming' and icon is null;
update public.categories set icon = '💻' where slug = 'tech' and icon is null;
update public.categories set icon = '👗' where slug = 'fashion' and icon is null;
update public.categories set icon = '📸' where slug = 'lifestyle' and icon is null;
update public.categories set icon = '🎭' where slug = 'comedy' and icon is null;
update public.categories set icon = '✨' where slug = 'other' and icon is null;
update public.categories set icon = '💄' where slug = 'beauty' and icon is null;
update public.categories set icon = '💪' where slug = 'fitness' and icon is null;
update public.categories set icon = '🍔' where slug = 'food' and icon is null;
update public.categories set icon = '✈️' where slug = 'travel' and icon is null;
update public.categories set icon = '📱' where slug = 'technology' and icon is null;
update public.categories set icon = '📚' where slug = 'education' and icon is null;
update public.categories set icon = '💰' where slug = 'finance' and icon is null;
update public.categories set icon = '📷' where slug = 'photography' and icon is null;
update public.categories set icon = '💼' where slug = 'business' and icon is null;
update public.categories set icon = '📣' where slug = 'digital-marketing' and icon is null;
update public.categories set icon = '🎪' where slug = 'entertainment' and icon is null;
update public.categories set icon = '❤️' where slug = 'health' and icon is null;

insert into public.categories (name, slug, icon) values
  ('Devotional', 'devotional', '🙏'),
  ('Motivation', 'motivation', '🔥'),
  ('Dance', 'dance', '💃'),
  ('Health & Wellness', 'health-wellness', '🧘'),
  ('Vlogs', 'vlogs', '📸'),
  ('Astrology', 'astrology', '🔮'),
  ('News', 'news', '📰'),
  ('Sports', 'sports', '⚽'),
  ('Pets & Animals', 'pets-animals', '🐾'),
  ('Automobile', 'automobile', '🚗')
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon;

update public.categories set icon = '⚽' where slug = 'sports';
