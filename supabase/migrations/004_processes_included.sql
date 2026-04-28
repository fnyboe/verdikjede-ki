-- ============================================================
-- 004_processes_included.sql
-- Køyr denne i Supabase SQL Editor
-- ============================================================

alter table public.processes
  add column included boolean not null default true;
