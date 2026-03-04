-- ============================================
-- Samuell Server - Supabase SQL Schema
-- Run this in your Supabase SQL editor
-- ============================================

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  phone_number text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bot sessions table (one per user)
create table if not exists public.bot_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique,
  status text default 'stopped' check (status in ('running', 'connected', 'stopped', 'error', 'disconnected')),
  phone_number text,
  started_at timestamptz,
  last_active timestamptz,
  total_runtime_seconds bigint default 0,
  message_count bigint default 0,
  restart_count int default 0,
  created_at timestamptz default now()
);

-- Bot logs table (recent logs only)
create table if not exists public.bot_logs (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  level text default 'info' check (level in ('info', 'warn', 'error', 'pairing')),
  message text not null,
  created_at timestamptz default now()
);

-- Analytics snapshots (daily)
create table if not exists public.analytics_snapshots (
  id bigserial primary key,
  total_users int default 0,
  active_sessions int default 0,
  total_messages bigint default 0,
  total_runtime_hours bigint default 0,
  snapshot_date date default current_date unique
);

-- ============================================
-- Indexes for performance
-- ============================================
create index if not exists idx_bot_sessions_user_id on public.bot_sessions(user_id);
create index if not exists idx_bot_logs_user_id on public.bot_logs(user_id);
create index if not exists idx_bot_logs_created_at on public.bot_logs(created_at desc);
create index if not exists idx_analytics_snapshots_date on public.analytics_snapshots(snapshot_date desc);

-- ============================================
-- Helper functions
-- ============================================

-- Increment a counter by 1
create or replace function increment(x int)
returns int
language sql immutable
as $$
  select x + 1
$$;

-- Increment by a custom amount
create or replace function increment_by(x bigint)
returns bigint
language sql immutable
as $$
  select x + 1
$$;

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.bot_sessions enable row level security;
alter table public.bot_logs enable row level security;
alter table public.analytics_snapshots enable row level security;

-- Profiles: users can read/update their own, admins can read all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Allow insert for new registrations
create policy "Allow profile creation on signup"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Bot sessions: users see only their own
create policy "Users can view own bot session"
  on public.bot_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own bot session"
  on public.bot_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bot session"
  on public.bot_sessions for update
  using (auth.uid() = user_id);

-- Bot logs: users see only their own
create policy "Users can view own logs"
  on public.bot_logs for select
  using (auth.uid() = user_id);

-- Analytics: readable by all authenticated users
create policy "Authenticated users can read analytics"
  on public.analytics_snapshots for select
  using (auth.role() = 'authenticated');

-- ============================================
-- Auto-create profile on user signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Auto-cleanup old logs (keep last 7 days)
-- ============================================
create or replace function cleanup_old_logs()
returns void
language sql
as $$
  delete from public.bot_logs
  where created_at < now() - interval '7 days';
$$;

-- Note: To run cleanup daily, call cleanup_old_logs() via a pg_cron job
-- or add it to your backend cron scheduler.
