create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  nickname text default '',
  full_name text default '',
  avatar_url text default '',
  banner_url text default '',
  bio text default '',
  custom_title text default '',
  victory_count integer not null default 0,
  showcase_image_url text default '',
  showcase_image_scale numeric not null default 1,
  featured_deck_id uuid,
  reset_password_token_hash text default '',
  reset_password_expires_at timestamptz,
  friends uuid[] not null default '{}',
  blocked uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  commander text default '',
  format text not null default 'commander',
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  code text primary key,
  name text not null,
  is_public boolean not null default false,
  players jsonb not null default '[]'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  owner text,
  start_time timestamptz,
  stack jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists decks_user_id_updated_at_idx
  on public.decks (user_id, updated_at desc);

create index if not exists rooms_is_public_updated_at_idx
  on public.rooms (is_public, updated_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_app_users_updated_at on public.app_users;
create trigger set_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

drop trigger if exists set_decks_updated_at on public.decks;
create trigger set_decks_updated_at
before update on public.decks
for each row execute function public.set_updated_at();

drop trigger if exists set_rooms_updated_at on public.rooms;
create trigger set_rooms_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();
