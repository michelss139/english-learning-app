-- Add username and avatar_url to profiles and backfill avatars

alter table profiles
  add column if not exists username text,
  add column if not exists avatar_url text;

create unique index if not exists profiles_username_unique
  on profiles (lower(username))
  where username is not null;

update profiles
set avatar_url = '/avatars/avatar' || lpad(((floor(random() * 9) + 1))::text, 2, '0') || '.png'
where avatar_url is null;
