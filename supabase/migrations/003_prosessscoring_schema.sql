-- ============================================================
-- 003_prosessscoring_schema.sql
-- Køyr denne i Supabase SQL Editor
-- ============================================================

-- a. Legg til vc_step_id på processes
alter table public.processes
  add column vc_step_id uuid references public.vc_steps(id) on delete cascade;

-- b. Legg til scores på processes
alter table public.processes
  add column scores jsonb not null default '{}';

-- c. Legg til weights på analyses
alter table public.analyses
  add column weights jsonb not null default '{"operational":20,"process":20,"data":20,"risk":20,"change":20}';

-- d. Oppdater RLS på processes: drop gamle, legg til nye via vc_steps
drop policy "tilgang til processes via analyse"       on public.processes;
drop policy "skrivetilgang til processes via analyse" on public.processes;
drop policy "oppdater processes via analyse"          on public.processes;
drop policy "slett processes via analyse"             on public.processes;

create policy "tilgang til processes via vc_step"
  on public.processes for select
  using (
    exists (
      select 1 from public.vc_steps vs
      join public.analyses a on a.id = vs.analysis_id
      where vs.id = vc_step_id
        and (a.company_id = public.my_company_id() or public.my_role() = 'admin')
    )
  );

create policy "skrivetilgang til processes via vc_step"
  on public.processes for insert
  with check (
    exists (
      select 1 from public.vc_steps vs
      join public.analyses a on a.id = vs.analysis_id
      where vs.id = vc_step_id
        and a.company_id = public.my_company_id()
    )
  );

create policy "oppdater processes via vc_step"
  on public.processes for update
  using (
    exists (
      select 1 from public.vc_steps vs
      join public.analyses a on a.id = vs.analysis_id
      where vs.id = vc_step_id
        and a.company_id = public.my_company_id()
    )
  );

create policy "slett processes via vc_step"
  on public.processes for delete
  using (
    exists (
      select 1 from public.vc_steps vs
      join public.analyses a on a.id = vs.analysis_id
      where vs.id = vc_step_id
        and a.company_id = public.my_company_id()
    )
  );
