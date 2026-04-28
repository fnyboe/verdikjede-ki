-- ============================================================
-- 001_initial_schema.sql
-- Køyr denne i Supabase SQL Editor
-- ============================================================


-- ============================================================
-- TABELLAR
-- ============================================================

create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('admin', 'company', 'member')),
  company_id  uuid references public.companies(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.analyses (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.vc_steps (
  id           uuid primary key default gen_random_uuid(),
  analysis_id  uuid not null references public.analyses(id) on delete cascade,
  name         text not null,
  order_index  int  not null,
  created_at   timestamptz not null default now()
);

create table public.processes (
  id             uuid primary key default gen_random_uuid(),
  analysis_id    uuid not null references public.analyses(id) on delete cascade,
  name           text not null,
  order_index    int  not null,
  problem_desc   text,
  usecase_desc   text,
  ai_suggestion  jsonb,
  created_at     timestamptz not null default now()
);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  process_id  uuid not null references public.processes(id) on delete cascade,
  name        text not null,
  automation  text not null default '',
  potential   text not null default '',
  tech        text not null default '',
  created_at  timestamptz not null default now()
);


-- ============================================================
-- TRIGGER: updated_at på analyses
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger analyses_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();


-- ============================================================
-- TRIGGER: auto-opprett profil ved ny auth-brukar
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'member');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- RLS: aktiver på alle tabellar
-- ============================================================

alter table public.companies  enable row level security;
alter table public.profiles   enable row level security;
alter table public.analyses   enable row level security;
alter table public.vc_steps   enable row level security;
alter table public.processes  enable row level security;
alter table public.tasks      enable row level security;


-- ============================================================
-- HJELPEFUNKSJON: hent rolle og company_id for innlogga brukar
-- ============================================================

create or replace function public.my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_company_id()
returns uuid language sql security definer stable as $$
  select company_id from public.profiles where id = auth.uid();
$$;


-- ============================================================
-- RLS-POLITIKKAR: companies
-- ============================================================

create policy "admin ser alle bedrifter"
  on public.companies for select
  using (public.my_role() = 'admin');

create policy "company/member ser eigen bedrift"
  on public.companies for select
  using (id = public.my_company_id());

create policy "admin kan opprette bedrifter"
  on public.companies for insert
  with check (public.my_role() = 'admin');

create policy "admin kan oppdatere bedrifter"
  on public.companies for update
  using (public.my_role() = 'admin');


-- ============================================================
-- RLS-POLITIKKAR: profiles
-- ============================================================

create policy "admin ser alle profiler"
  on public.profiles for select
  using (public.my_role() = 'admin');

create policy "company/member ser profiler i eigen bedrift"
  on public.profiles for select
  using (company_id = public.my_company_id());

create policy "brukar ser eigen profil"
  on public.profiles for select
  using (id = auth.uid());

create policy "admin kan oppdatere alle profiler"
  on public.profiles for update
  using (public.my_role() = 'admin');

create policy "brukar kan oppdatere eigen profil"
  on public.profiles for update
  using (id = auth.uid());

create policy "service role kan opprette profiler"
  on public.profiles for insert
  with check (true);


-- ============================================================
-- RLS-POLITIKKAR: analyses
-- ============================================================

create policy "company/member ser eiga bedrifts analysar"
  on public.analyses for select
  using (company_id = public.my_company_id());

create policy "admin ser alle analysar"
  on public.analyses for select
  using (public.my_role() = 'admin');

create policy "company/member kan opprette analyse"
  on public.analyses for insert
  with check (company_id = public.my_company_id());

create policy "company/member kan oppdatere eiga analyse"
  on public.analyses for update
  using (company_id = public.my_company_id());

create policy "company/member kan slette eiga analyse"
  on public.analyses for delete
  using (company_id = public.my_company_id());


-- ============================================================
-- RLS-POLITIKKAR: vc_steps (arvar tilgang frå analyses)
-- ============================================================

create policy "tilgang til vc_steps via analyse"
  on public.vc_steps for select
  using (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id
        and (a.company_id = public.my_company_id() or public.my_role() = 'admin')
    )
  );

create policy "skrivetilgang til vc_steps via analyse"
  on public.vc_steps for insert
  with check (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id
        and a.company_id = public.my_company_id()
    )
  );

create policy "oppdater vc_steps via analyse"
  on public.vc_steps for update
  using (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id
        and a.company_id = public.my_company_id()
    )
  );

create policy "slett vc_steps via analyse"
  on public.vc_steps for delete
  using (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id
        and a.company_id = public.my_company_id()
    )
  );


-- ============================================================
-- RLS-POLITIKKAR: processes (arvar tilgang frå analyses)
-- ============================================================

create policy "tilgang til processes via analyse"
  on public.processes for select
  using (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id
        and (a.company_id = public.my_company_id() or public.my_role() = 'admin')
    )
  );

create policy "skrivetilgang til processes via analyse"
  on public.processes for insert
  with check (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id
        and a.company_id = public.my_company_id()
    )
  );

create policy "oppdater processes via analyse"
  on public.processes for update
  using (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id
        and a.company_id = public.my_company_id()
    )
  );

create policy "slett processes via analyse"
  on public.processes for delete
  using (
    exists (
      select 1 from public.analyses a
      where a.id = analysis_id
        and a.company_id = public.my_company_id()
    )
  );


-- ============================================================
-- RLS-POLITIKKAR: tasks (arvar tilgang frå processes → analyses)
-- ============================================================

create policy "tilgang til tasks via process"
  on public.tasks for select
  using (
    exists (
      select 1 from public.processes p
      join public.analyses a on a.id = p.analysis_id
      where p.id = process_id
        and (a.company_id = public.my_company_id() or public.my_role() = 'admin')
    )
  );

create policy "skrivetilgang til tasks via process"
  on public.tasks for insert
  with check (
    exists (
      select 1 from public.processes p
      join public.analyses a on a.id = p.analysis_id
      where p.id = process_id
        and a.company_id = public.my_company_id()
    )
  );

create policy "oppdater tasks via process"
  on public.tasks for update
  using (
    exists (
      select 1 from public.processes p
      join public.analyses a on a.id = p.analysis_id
      where p.id = process_id
        and a.company_id = public.my_company_id()
    )
  );

create policy "slett tasks via process"
  on public.tasks for delete
  using (
    exists (
      select 1 from public.processes p
      join public.analyses a on a.id = p.analysis_id
      where p.id = process_id
        and a.company_id = public.my_company_id()
    )
  );
