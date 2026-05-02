alter table public.analyses
  add column if not exists company_description  text,
  add column if not exists website_url          text;
