-- Enable Supabase Realtime (Postgres Changes) for Tab Management tables
-- This migration adds the relevant tables to the existing `supabase_realtime` publication
-- so clients can subscribe to realtime changes via `postgres_changes`.

-- Add Tab-related tables to supabase_realtime publication
alter publication supabase_realtime
  add table public.order_sessions;

alter publication supabase_realtime
  add table public.restaurant_tables;
