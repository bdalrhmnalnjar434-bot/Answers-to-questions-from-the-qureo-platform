
-- TXT Vault: Database and access policies
-- Replace the placeholder with the real owner's Auth UID.

create table public.txt_files (
  id uuid primary key default gen_random_uuid(),
  title text not null
    check (char_length(title) between 1 and 150),
  description text not null default '',
  storage_path text not null unique,
  is_public boolean not null default true,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.txt_files enable row level security;

-- Public visitors can see public file metadata only.
create policy "Anyone can list public TXT files"
on public.txt_files
for select
to anon, authenticated
using (
  is_public = true
  or owner_id = auth.uid()
);

-- Only the designated owner can create records.
create policy "Owner can insert TXT metadata"
on public.txt_files
for insert
to authenticated
with check (
  auth.uid() = '14ed95f2-62d5-4313-9861-5c0a6139409d'::uuid
  and owner_id = auth.uid()
);

-- Only the owner can change records.
create policy "Owner can update TXT metadata"
on public.txt_files
for update
to authenticated
using (
  auth.uid() = '14ed95f2-62d5-4313-9861-5c0a6139409d'::uuid
  and owner_id = auth.uid()
)
with check (
  auth.uid() = '14ed95f2-62d5-4313-9861-5c0a6139409d'::uuid
  and owner_id = auth.uid()
);

-- Only the owner can delete records.
create policy "Owner can delete TXT metadata"
on public.txt_files
for delete
to authenticated
using (
  auth.uid() = '14ed95f2-62d5-4313-9861-5c0a6139409d'::uuid
  and owner_id = auth.uid()
);

-- Allow browser clients to query public rows and owner-visible rows.
grant select on public.txt_files to anon, authenticated;
grant insert, update, delete
on public.txt_files to authenticated;

-- Storage policies: public files can be read by anyone,
-- private files only by the owner.
create policy "Read public TXT objects or owner objects"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'txt-files'
  and exists (
    select 1
    from public.txt_files f
    where f.storage_path = name
      and (
        f.is_public = true
        or f.owner_id = auth.uid()
      )
  )
);

create policy "Owner can upload TXT objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'txt-files'
  and auth.uid() = '14ed95f2-62d5-4313-9861-5c0a6139409d'::uuid
);

create policy "Owner can update TXT objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'txt-files'
  and auth.uid() = '14ed95f2-62d5-4313-9861-5c0a6139409d'::uuid
)
with check (
  bucket_id = 'txt-files'
  and auth.uid() = '14ed95f2-62d5-4313-9861-5c0a6139409d'::uuid
);

create policy "Owner can delete TXT objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'txt-files'
  and auth.uid() = '14ed95f2-62d5-4313-9861-5c0a6139409d'::uuid
);
