alter table public.analyses
  add column if not exists company_name  text,
  add column if not exists logo_base64   text;
