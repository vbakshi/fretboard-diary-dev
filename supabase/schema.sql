-- Run in Supabase SQL Editor (Dashboard → SQL → New query).
-- Enable Google + GitHub under Authentication → Providers first.
-- Add redirect URLs: http://localhost:5173 and your production URL.

-- Profiles (auto-created on signup via trigger)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- Lessons
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  song_title text not null,
  artist text,
  visibility text default 'private'
    check (visibility in ('private', 'followers', 'public')),
  reference_video jsonb,
  chord_palette text[],
  progression text[],
  sequences jsonb default '[]',
  sections jsonb default '[]',
  status text default 'building'
    check (status in ('building', 'practicing', 'learned')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Follows
create table if not exists follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Likes
create table if not exists likes (
  user_id uuid references profiles(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, lesson_id)
);

-- Activity log
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Notifications (lesson_id nullable for follow events)
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete cascade,
  type text not null
    check (type in ('follow', 'like', 'lesson_copy')),
  lesson_id uuid references lessons(id) on delete set null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Lesson views
create table if not exists lesson_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid references profiles(id) on delete set null,
  lesson_id uuid references lessons(id) on delete cascade,
  viewed_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  uname text;
begin
  base := coalesce(
    nullif(trim(new.raw_user_meta_data->>'preferred_username'), ''),
    nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'user'
  );
  base := regexp_replace(lower(base), '[^a-z0-9_]', '_', 'g');
  if base = '' or base is null then
    base := 'user';
  end if;
  uname := base || '_' || substr(replace(new.id::text, '-', ''), 1, 12);

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    uname,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), '')
    ),
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at on lessons
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lessons_updated_at on lessons;
create trigger lessons_updated_at
  before update on lessons
  for each row execute function public.update_updated_at();

-- Row Level Security
alter table profiles enable row level security;
alter table lessons enable row level security;
alter table follows enable row level security;
alter table likes enable row level security;
alter table notifications enable row level security;
alter table activity_log enable row level security;
alter table lesson_views enable row level security;

drop policy if exists "profiles_public_read" on profiles;
create policy "profiles_public_read"
  on profiles for select using (true);

drop policy if exists "profiles_own_update" on profiles;
create policy "profiles_own_update"
  on profiles for update using (auth.uid() = id);

drop policy if exists "profiles_own_insert" on profiles;
create policy "profiles_own_insert"
  on profiles for insert with check (auth.uid() = id);

drop policy if exists "lessons_visibility_read" on lessons;
create policy "lessons_visibility_read"
  on lessons for select using (
    auth.uid() = user_id
    or visibility = 'public'
    or (
      visibility = 'followers'
      and exists (
        select 1 from follows
        where follower_id = auth.uid()
        and following_id = lessons.user_id
      )
    )
  );

drop policy if exists "lessons_own_insert" on lessons;
create policy "lessons_own_insert"
  on lessons for insert with check (auth.uid() = user_id);

drop policy if exists "lessons_own_update" on lessons;
create policy "lessons_own_update"
  on lessons for update using (auth.uid() = user_id);

drop policy if exists "lessons_own_delete" on lessons;
create policy "lessons_own_delete"
  on lessons for delete using (auth.uid() = user_id);

drop policy if exists "follows_public_read" on follows;
create policy "follows_public_read"
  on follows for select using (true);

drop policy if exists "follows_own_insert" on follows;
create policy "follows_own_insert"
  on follows for insert with check (auth.uid() = follower_id);

drop policy if exists "follows_own_delete" on follows;
create policy "follows_own_delete"
  on follows for delete using (auth.uid() = follower_id);

drop policy if exists "likes_public_read" on likes;
create policy "likes_public_read"
  on likes for select using (true);

drop policy if exists "likes_own_insert" on likes;
create policy "likes_own_insert"
  on likes for insert with check (auth.uid() = user_id);

drop policy if exists "likes_own_delete" on likes;
create policy "likes_own_delete"
  on likes for delete using (auth.uid() = user_id);

drop policy if exists "notifications_own_read" on notifications;
create policy "notifications_own_read"
  on notifications for select using (auth.uid() = recipient_id);

drop policy if exists "notifications_own_update" on notifications;
create policy "notifications_own_update"
  on notifications for update using (auth.uid() = recipient_id);

drop policy if exists "notifications_insert_authenticated" on notifications;
create policy "notifications_insert_authenticated"
  on notifications for insert with check (auth.role() = 'authenticated');

drop policy if exists "activity_own_read" on activity_log;
create policy "activity_own_read"
  on activity_log for select using (auth.uid() = user_id);

drop policy if exists "activity_own_insert" on activity_log;
create policy "activity_own_insert"
  on activity_log for insert with check (auth.uid() = user_id);

drop policy if exists "views_insert" on lesson_views;
create policy "views_insert"
  on lesson_views for insert with check (auth.role() = 'authenticated');

drop policy if exists "views_own_read" on lesson_views;
create policy "views_own_read"
  on lesson_views for select using (auth.uid() = viewer_id);
