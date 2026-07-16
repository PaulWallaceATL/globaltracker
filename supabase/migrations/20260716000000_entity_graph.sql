-- GlobalTracker entity graph — auth-ready (nullable user_id / org stubs)

create extension if not exists "pgcrypto";

-- Auth-ready stubs -----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  preferred_lens text default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Core entities --------------------------------------------------------------
create table if not exists public.places (
  id text primary key,
  kind text not null default 'country' check (kind in ('country', 'city', 'aoi', 'region')),
  name text not null,
  slug text not null unique,
  iso2 text,
  iso3 text,
  lat double precision not null,
  lng double precision not null,
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  population bigint,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.topics (
  id text primary key,
  slug text not null unique,
  label text not null,
  description text,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key,
  type text not null,
  description text not null,
  timestamp timestamptz not null,
  source text not null,
  lat double precision not null,
  lng double precision not null,
  news_links text[] not null default '{}',
  meta jsonb not null default '{}'::jsonb,
  severity int not null default 1 check (severity between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_items (
  id text primary key,
  title text not null,
  description text,
  url text not null unique,
  source text,
  published_at timestamptz,
  image_url text,
  lat double precision,
  lng double precision,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.situations (
  id text primary key,
  title text not null,
  summary text not null,
  severity int not null default 2 check (severity between 1 and 5),
  status text not null default 'active' check (status in ('active', 'monitoring', 'resolved')),
  centroid_lat double precision not null,
  centroid_lng double precision not null,
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  place_id text references public.places (id) on delete set null,
  briefs jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Join tables ----------------------------------------------------------------
create table if not exists public.event_places (
  event_id text not null references public.events (id) on delete cascade,
  place_id text not null references public.places (id) on delete cascade,
  primary key (event_id, place_id)
);

create table if not exists public.event_topics (
  event_id text not null references public.events (id) on delete cascade,
  topic_id text not null references public.topics (id) on delete cascade,
  primary key (event_id, topic_id)
);

create table if not exists public.event_media (
  event_id text not null references public.events (id) on delete cascade,
  media_id text not null references public.media_items (id) on delete cascade,
  primary key (event_id, media_id)
);

create table if not exists public.situation_events (
  situation_id text not null references public.situations (id) on delete cascade,
  event_id text not null references public.events (id) on delete cascade,
  primary key (situation_id, event_id)
);

create table if not exists public.situation_topics (
  situation_id text not null references public.situations (id) on delete cascade,
  topic_id text not null references public.topics (id) on delete cascade,
  primary key (situation_id, topic_id)
);

-- Bookmarks / history (anonymous device_id now; user_id later) ---------------
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  device_id text,
  entity_type text not null check (entity_type in ('situation', 'place', 'topic', 'event')),
  entity_id text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (device_id, entity_type, entity_id)
);

create table if not exists public.view_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  device_id text,
  entity_type text not null check (entity_type in ('situation', 'place', 'topic', 'event')),
  entity_id text not null,
  viewed_at timestamptz not null default now()
);

-- Indexes --------------------------------------------------------------------
create index if not exists places_slug_idx on public.places (slug);
create index if not exists places_iso2_idx on public.places (iso2);
create index if not exists topics_slug_idx on public.topics (slug);
create index if not exists events_type_ts_idx on public.events (type, timestamp desc);
create index if not exists events_geo_idx on public.events (lat, lng);
create index if not exists situations_status_idx on public.situations (status, severity desc);
create index if not exists situations_title_trgm_idx on public.situations using gin (to_tsvector('english', title || ' ' || summary));
create index if not exists bookmarks_device_idx on public.bookmarks (device_id);
create index if not exists view_history_device_idx on public.view_history (device_id, viewed_at desc);

-- RLS ------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.places enable row level security;
alter table public.topics enable row level security;
alter table public.events enable row level security;
alter table public.media_items enable row level security;
alter table public.situations enable row level security;
alter table public.event_places enable row level security;
alter table public.event_topics enable row level security;
alter table public.event_media enable row level security;
alter table public.situation_events enable row level security;
alter table public.situation_topics enable row level security;
alter table public.bookmarks enable row level security;
alter table public.view_history enable row level security;

-- Public read for published intel
create policy "places_public_read" on public.places for select using (true);
create policy "topics_public_read" on public.topics for select using (true);
create policy "events_public_read" on public.events for select using (true);
create policy "media_public_read" on public.media_items for select using (true);
create policy "situations_public_read" on public.situations for select using (published = true);
create policy "event_places_public_read" on public.event_places for select using (true);
create policy "event_topics_public_read" on public.event_topics for select using (true);
create policy "event_media_public_read" on public.event_media for select using (true);
create policy "situation_events_public_read" on public.situation_events for select using (true);
create policy "situation_topics_public_read" on public.situation_topics for select using (true);

-- Bookmarks / history: device-scoped for anon; user-scoped when auth lands
create policy "bookmarks_device_all" on public.bookmarks
  for all using (
    (user_id is null and device_id is not null)
    or (auth.uid() is not null and user_id = auth.uid())
  )
  with check (
    (user_id is null and device_id is not null)
    or (auth.uid() is not null and user_id = auth.uid())
  );

create policy "view_history_device_all" on public.view_history
  for all using (
    (user_id is null and device_id is not null)
    or (auth.uid() is not null and user_id = auth.uid())
  )
  with check (
    (user_id is null and device_id is not null)
    or (auth.uid() is not null and user_id = auth.uid())
  );

-- Profiles / orgs stubs for later auth
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "orgs_member_read" on public.orgs
  for select using (
    exists (
      select 1 from public.org_members m
      where m.org_id = orgs.id and m.user_id = auth.uid()
    )
  );

create policy "org_members_self_read" on public.org_members
  for select using (user_id = auth.uid());
