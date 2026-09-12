-- Idempotent storage excerpt from 0006_platform_upgrade.sql.
-- Use this when 0006 has not been applied in full but creator image uploads are needed.
-- Bucket: creator-images (public read, 5 MB, jpeg/png/webp).
-- Authenticated users may insert/update only under their own user-id folder.
-- Service-role uploads used by POST /api/creators/upload-image bypass RLS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-images',
  'creator-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "creator images public read" on storage.objects;
create policy "creator images public read"
  on storage.objects for select
  using (bucket_id = 'creator-images');

drop policy if exists "authenticated upload creator images" on storage.objects;
create policy "authenticated upload creator images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'creator-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "authenticated update own creator images" on storage.objects;
create policy "authenticated update own creator images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'creator-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
