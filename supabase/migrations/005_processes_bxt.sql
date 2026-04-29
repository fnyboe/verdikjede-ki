alter table public.processes
  add column business_goal  text,
  add column key_results     text,
  add column responsible     text,
  add column bxt_scores      jsonb not null default '{}';
