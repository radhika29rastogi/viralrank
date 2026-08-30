-- Idempotent category seed for ViralRank.buzz
-- Run in Supabase SQL Editor if migrations were not applied.
-- Matches supabase/migrations/0001_init.sql (categories insert block).

insert into public.categories (name, slug) values
  ('Fashion', 'fashion'),
  ('Beauty', 'beauty'),
  ('Fitness', 'fitness'),
  ('Lifestyle', 'lifestyle'),
  ('Food', 'food'),
  ('Travel', 'travel'),
  ('Technology', 'technology'),
  ('Tech', 'tech'),
  ('Gaming', 'gaming'),
  ('Education', 'education'),
  ('Finance', 'finance'),
  ('Comedy', 'comedy'),
  ('Memes', 'memes'),
  ('Videos', 'videos'),
  ('Music', 'music'),
  ('Art', 'art'),
  ('Photography', 'photography'),
  ('Business', 'business'),
  ('Digital Marketing', 'digital-marketing'),
  ('Other', 'other')
on conflict (slug) do nothing;

-- Verify (Videos should return one row):
-- select id, name, slug from public.categories where slug = 'videos';
