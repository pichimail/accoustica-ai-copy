create extension if not exists "pgcrypto";

create or replace function public.set_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  daily_limit integer default 5,
  monthly_limit integer default 100,
  max_duration integer default 4,
  concurrent_jobs integer default 1,
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  price_monthly numeric default 0,
  model_access jsonb default '["V4","V4_5"]'::jsonb,
  priority integer default 10,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  app_key text unique not null,
  kie_api_key text,
  watermark_text text,
  watermark_logo_url text,
  google_auth_enabled boolean default false,
  google_client_id text,
  features jsonb default '{}'::jsonb,
  default_theme text,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.app_secrets (
  id uuid primary key default gen_random_uuid(),
  app_key text unique not null,
  google_client_secret text,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  full_name text,
  role text default 'user',
  account_status text default 'active',
  plan_id uuid references public.plans(id),
  daily_usage integer default 0,
  monthly_usage integer default 0,
  total_tracks integer default 0,
  last_usage_reset date,
  monthly_reset_date date,
  last_active timestamptz,
  appearance_theme text,
  avatar_url text,
  bio text,
  website text,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text,
  prompt text,
  style text,
  task_id text,
  status text,
  is_instrumental boolean default false,
  model_version text,
  audio_url text,
  stream_audio_url text,
  cover_image_url text,
  duration integer,
  tags text,
  external_audio_id text,
  lyrics text,
  error_message text,
  is_public boolean default false,
  is_favorite boolean default false,
  plays integer default 0,
  parent_track_id uuid references public.tracks(id),
  created_by text,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.track_likes (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete cascade,
  user_email text,
  type text default 'like',
  created_date timestamptz default now()
);

create table if not exists public.track_comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete cascade,
  user_email text,
  user_name text,
  comment_text text,
  timestamp_seconds integer,
  created_date timestamptz default now()
);

create table if not exists public.track_shares (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete cascade,
  shared_with_email text,
  permission text,
  message text,
  status text,
  created_by text,
  created_date timestamptz default now()
);

create table if not exists public.track_versions (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete cascade,
  parent_track_id uuid references public.tracks(id) on delete cascade,
  version_number integer,
  edit_type text,
  changes_description text,
  edited_by text,
  created_date timestamptz default now()
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  cover_image_url text,
  track_count integer default 0,
  created_by text,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references public.playlists(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete cascade,
  position integer default 0,
  created_date timestamptz default now()
);

create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  persona_id text,
  name text,
  description text,
  task_id text,
  audio_id text,
  track_id uuid references public.tracks(id) on delete set null,
  created_by text,
  created_date timestamptz default now()
);

create table if not exists public.mastering_presets (
  id uuid primary key default gen_random_uuid(),
  preset_name text,
  description text,
  loudness numeric,
  eq_adjust numeric,
  compression numeric,
  stereo_width numeric,
  bass_boost numeric,
  high_boost numeric,
  reference_track_url text,
  created_by text,
  created_date timestamptz default now()
);

create table if not exists public.video_generations (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete set null,
  task_id text,
  status text,
  provider text,
  generation_type text,
  prompt text,
  duration integer,
  quality text,
  aspect_ratio text,
  image_url text,
  video_url text,
  thumbnail_url text,
  error_message text,
  parent_task_id text,
  author text,
  domain_name text,
  created_by text,
  is_public boolean default false,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.stem_separations (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete set null,
  task_id text,
  separation_type text,
  status text,
  vocal_url text,
  instrumental_url text,
  backing_vocals_url text,
  drums_url text,
  bass_url text,
  guitar_url text,
  keyboard_url text,
  percussion_url text,
  strings_url text,
  synth_url text,
  fx_url text,
  brass_url text,
  woodwinds_url text,
  created_by text,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  created_by text,
  completed_steps jsonb default '[]'::jsonb,
  skipped boolean default false,
  is_completed boolean default false,
  created_date timestamptz default now(),
  updated_date timestamptz default now()
);

create table if not exists public.app_logs (
  id uuid primary key default gen_random_uuid(),
  page_name text,
  path text,
  created_by text,
  created_date timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, created_date, updated_date)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists update_profiles_updated_date on public.profiles;
create trigger update_profiles_updated_date
  before update on public.profiles
  for each row execute procedure public.set_updated_date();

drop trigger if exists update_plans_updated_date on public.plans;
create trigger update_plans_updated_date
  before update on public.plans
  for each row execute procedure public.set_updated_date();

drop trigger if exists update_app_settings_updated_date on public.app_settings;
create trigger update_app_settings_updated_date
  before update on public.app_settings
  for each row execute procedure public.set_updated_date();

drop trigger if exists update_app_secrets_updated_date on public.app_secrets;
create trigger update_app_secrets_updated_date
  before update on public.app_secrets
  for each row execute procedure public.set_updated_date();

drop trigger if exists update_tracks_updated_date on public.tracks;
create trigger update_tracks_updated_date
  before update on public.tracks
  for each row execute procedure public.set_updated_date();

drop trigger if exists update_playlists_updated_date on public.playlists;
create trigger update_playlists_updated_date
  before update on public.playlists
  for each row execute procedure public.set_updated_date();

drop trigger if exists update_video_generations_updated_date on public.video_generations;
create trigger update_video_generations_updated_date
  before update on public.video_generations
  for each row execute procedure public.set_updated_date();

drop trigger if exists update_stem_separations_updated_date on public.stem_separations;
create trigger update_stem_separations_updated_date
  before update on public.stem_separations
  for each row execute procedure public.set_updated_date();

drop trigger if exists update_onboarding_progress_updated_date on public.onboarding_progress;
create trigger update_onboarding_progress_updated_date
  before update on public.onboarding_progress
  for each row execute procedure public.set_updated_date();

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.app_settings enable row level security;
alter table public.app_secrets enable row level security;
alter table public.tracks enable row level security;
alter table public.track_likes enable row level security;
alter table public.track_comments enable row level security;
alter table public.track_shares enable row level security;
alter table public.track_versions enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.personas enable row level security;
alter table public.mastering_presets enable row level security;
alter table public.video_generations enable row level security;
alter table public.stem_separations enable row level security;
alter table public.onboarding_progress enable row level security;
alter table public.app_logs enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

create policy "plans_read" on public.plans
  for select using (true);

create policy "plans_write_admin" on public.plans
  for insert with check (public.is_admin());

create policy "plans_update_admin" on public.plans
  for update using (public.is_admin());

create policy "plans_delete_admin" on public.plans
  for delete using (public.is_admin());

create policy "app_settings_read" on public.app_settings
  for select using (true);

create policy "app_settings_write_admin" on public.app_settings
  for insert with check (public.is_admin());

create policy "app_settings_update_admin" on public.app_settings
  for update using (public.is_admin());

create policy "app_settings_delete_admin" on public.app_settings
  for delete using (public.is_admin());

create policy "app_secrets_read_admin" on public.app_secrets
  for select using (public.is_admin());

create policy "app_secrets_write_admin" on public.app_secrets
  for insert with check (public.is_admin());

create policy "app_secrets_update_admin" on public.app_secrets
  for update using (public.is_admin());

create policy "app_secrets_delete_admin" on public.app_secrets
  for delete using (public.is_admin());

create policy "tracks_read_public_or_owner" on public.tracks
  for select using (
    is_public = true
    or created_by = coalesce(auth.jwt() ->> 'email', '')
    or public.is_admin()
  );

create policy "tracks_write_authenticated" on public.tracks
  for insert with check (auth.role() = 'authenticated');

create policy "tracks_update_owner" on public.tracks
  for update using (
    created_by = coalesce(auth.jwt() ->> 'email', '')
    or public.is_admin()
  );

create policy "tracks_delete_owner" on public.tracks
  for delete using (
    created_by = coalesce(auth.jwt() ->> 'email', '')
    or public.is_admin()
  );

create policy "app_logs_write_authenticated" on public.app_logs
  for insert with check (auth.role() = 'authenticated');

create policy "tables_read_authenticated" on public.track_likes
  for select using (auth.role() = 'authenticated');
create policy "tables_write_authenticated" on public.track_likes
  for insert with check (auth.role() = 'authenticated');

create policy "tables_read_authenticated" on public.track_comments
  for select using (auth.role() = 'authenticated');
create policy "tables_write_authenticated" on public.track_comments
  for insert with check (auth.role() = 'authenticated');
create policy "tables_delete_authenticated" on public.track_comments
  for delete using (auth.role() = 'authenticated');

create policy "tables_read_authenticated" on public.track_shares
  for select using (auth.role() = 'authenticated');
create policy "tables_write_authenticated" on public.track_shares
  for insert with check (auth.role() = 'authenticated');
create policy "tables_delete_authenticated" on public.track_shares
  for delete using (auth.role() = 'authenticated');

create policy "tables_read_authenticated" on public.track_versions
  for select using (auth.role() = 'authenticated');
create policy "tables_write_authenticated" on public.track_versions
  for insert with check (auth.role() = 'authenticated');

create policy "tables_read_authenticated" on public.playlists
  for select using (auth.role() = 'authenticated');
create policy "tables_write_authenticated" on public.playlists
  for insert with check (auth.role() = 'authenticated');
create policy "tables_update_authenticated" on public.playlists
  for update using (auth.role() = 'authenticated');

create policy "tables_read_authenticated" on public.playlist_tracks
  for select using (auth.role() = 'authenticated');
create policy "tables_write_authenticated" on public.playlist_tracks
  for insert with check (auth.role() = 'authenticated');
create policy "tables_delete_authenticated" on public.playlist_tracks
  for delete using (auth.role() = 'authenticated');

create policy "tables_read_authenticated" on public.personas
  for select using (auth.role() = 'authenticated');
create policy "tables_write_authenticated" on public.personas
  for insert with check (auth.role() = 'authenticated');
create policy "tables_delete_authenticated" on public.personas
  for delete using (auth.role() = 'authenticated');

create policy "tables_read_authenticated" on public.mastering_presets
  for select using (auth.role() = 'authenticated');
create policy "tables_write_authenticated" on public.mastering_presets
  for insert with check (auth.role() = 'authenticated');
create policy "tables_delete_authenticated" on public.mastering_presets
  for delete using (auth.role() = 'authenticated');

create policy "video_read_public_or_owner" on public.video_generations
  for select using (
    is_public = true
    or created_by = coalesce(auth.jwt() ->> 'email', '')
    or public.is_admin()
  );
create policy "video_write_authenticated" on public.video_generations
  for insert with check (auth.role() = 'authenticated');
create policy "video_update_owner" on public.video_generations
  for update using (
    created_by = coalesce(auth.jwt() ->> 'email', '')
    or public.is_admin()
  );

create policy "tables_read_authenticated" on public.stem_separations
  for select using (auth.role() = 'authenticated');
create policy "tables_write_authenticated" on public.stem_separations
  for insert with check (auth.role() = 'authenticated');
create policy "tables_update_authenticated" on public.stem_separations
  for update using (auth.role() = 'authenticated');

create policy "tables_read_authenticated" on public.onboarding_progress
  for select using (auth.role() = 'authenticated');
create policy "tables_write_authenticated" on public.onboarding_progress
  for insert with check (auth.role() = 'authenticated');
create policy "tables_update_authenticated" on public.onboarding_progress
  for update using (auth.role() = 'authenticated');
