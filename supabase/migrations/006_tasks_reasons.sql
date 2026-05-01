-- Add automation_reason, improvement (integer), improvement_reason columns
alter table public.tasks
  add column if not exists automation_reason  text not null default '',
  add column if not exists improvement        integer not null default 3,
  add column if not exists improvement_reason text not null default '';

-- Convert automation from text to integer (existing rows get 3 as default)
alter table public.tasks
  alter column automation type integer using coalesce(automation::integer, 3);
alter table public.tasks
  alter column automation set default 3;
