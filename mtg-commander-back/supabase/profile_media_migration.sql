create extension if not exists pgcrypto;

alter table if exists public.app_users
  add column if not exists avatar_url text default '',
  add column if not exists banner_url text default '',
  add column if not exists bio text default '',
  add column if not exists custom_title text default '',
  add column if not exists victory_count integer default 0,
  add column if not exists showcase_image_url text default '',
  add column if not exists showcase_image_scale numeric default 1,
  add column if not exists featured_deck_id uuid,
  add column if not exists reset_password_token_hash text default '',
  add column if not exists reset_password_expires_at timestamptz,
  add column if not exists friends uuid[] default '{}',
  add column if not exists blocked uuid[] default '{}',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.app_users
set
  avatar_url = coalesce(avatar_url, ''),
  banner_url = coalesce(banner_url, ''),
  bio = coalesce(bio, ''),
  custom_title = coalesce(custom_title, ''),
  victory_count = coalesce(victory_count, 0),
  showcase_image_url = coalesce(showcase_image_url, ''),
  showcase_image_scale = coalesce(showcase_image_scale, 1),
  reset_password_token_hash = coalesce(reset_password_token_hash, ''),
  friends = coalesce(friends, '{}'),
  blocked = coalesce(blocked, '{}'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.app_users
  alter column avatar_url set default '',
  alter column banner_url set default '',
  alter column bio set default '',
  alter column custom_title set default '',
  alter column victory_count set default 0,
  alter column showcase_image_url set default '',
  alter column showcase_image_scale set default 1,
  alter column reset_password_token_hash set default '',
  alter column friends set default '{}',
  alter column blocked set default '{}',
  alter column created_at set default now(),
  alter column updated_at set default now(),
  alter column victory_count set not null,
  alter column showcase_image_scale set not null,
  alter column friends set not null,
  alter column blocked set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/*']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
