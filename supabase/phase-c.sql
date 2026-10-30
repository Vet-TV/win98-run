-- win98-run Phase C: Plus subscriptions (Stripe via Vercel Functions)
-- Run this in your Supabase project's SQL editor (once, after schema.sql).
-- Written only by the Stripe webhook (service role, bypasses RLS).
-- Signed-in users can read their own row to show plan status in the app.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'none', -- active | trialing | past_due | canceled | incomplete | none
  interval text,                       -- month | year
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Read-own only. No client inserts/updates/deletes: the webhook's
-- service_role key bypasses RLS and is the only writer.
drop policy if exists "own subscription select" on public.subscriptions;
create policy "own subscription select" on public.subscriptions
  for select using (auth.uid() = user_id);
