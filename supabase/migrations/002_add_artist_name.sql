-- Add artist_name field to profiles table for user-generated content attribution
alter table public.profiles
add column if not exists artist_name text;

-- Add comment for documentation
comment on column public.profiles.artist_name is 'Artist name displayed on generated music and videos';
