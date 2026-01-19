-- Files metadata table
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  mime_type text,
  size bigint not null,
  storage_bucket text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists files_user_id_created_at_idx on public.files (user_id, created_at desc);

alter table public.files enable row level security;

-- RLS: users can only see their own rows
create policy "files_select_own" on public.files
for select
using (auth.uid() = user_id);

-- RLS: users can insert only for themselves
create policy "files_insert_own" on public.files
for insert
with check (auth.uid() = user_id);

-- RLS: users can delete only their own rows
create policy "files_delete_own" on public.files
for delete
using (auth.uid() = user_id);

-- Storage policies (private bucket)
-- Create a bucket named 'files' in Supabase dashboard (Storage).
-- Then apply policies on storage.objects:

-- Allow authenticated users to read their own files
create policy "storage_read_own" on storage.objects
for select
using (
  bucket_id = 'files'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to upload into their own folder
create policy "storage_insert_own" on storage.objects
for insert
with check (
  bucket_id = 'files'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own objects
create policy "storage_delete_own" on storage.objects
for delete
using (
  bucket_id = 'files'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
