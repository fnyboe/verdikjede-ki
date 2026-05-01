alter table public.analyses
  add column if not exists vc_control    text,
  add column if not exists tech_breadth  text,
  add column if not exists strategy_text text;
