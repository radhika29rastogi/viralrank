insert into public.categories (name, slug) values
  ('Memes', 'memes'),
  ('Videos', 'videos'),
  ('Tech', 'tech')
on conflict (slug) do nothing;
