-- win98-run cloud schema (Phase B)
-- Run this in your Supabase project's SQL editor, then create a PRIVATE
-- storage bucket named: vm-states

create table if not exists public.cloud_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  disk_key text not null,
  name text not null default '',
  size bigint not null default 0,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, disk_key)
);

alter table public.cloud_states enable row level security;

create policy "own states select" on public.cloud_states
  for select using (auth.uid() = user_id);
create policy "own states insert" on public.cloud_states
  for insert with check (auth.uid() = user_id);
create policy "own states update" on public.cloud_states
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own states delete" on public.cloud_states
  for delete using (auth.uid() = user_id);

-- Storage policies for the private vm-states bucket.
-- Files live under a per-user folder: <user_id>/<disk_key>.bin
create policy "own folder read" on storage.objects
  for select using (bucket_id = 'vm-states' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder write" on storage.objects
  for insert with check (bucket_id = 'vm-states' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder update" on storage.objects
  for update using (bucket_id = 'vm-states' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder delete" on storage.objects
  for delete using (bucket_id = 'vm-states' and (storage.foldername(name))[1] = auth.uid()::text);
