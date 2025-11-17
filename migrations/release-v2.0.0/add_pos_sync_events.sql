-- pos_sync_events telemetry and helper RPCs
-- Captures per-mutation ingest metrics so dashboards can track failures/latency

create table if not exists pos_sync_events (
  id bigserial primary key,
  device_id text not null,
  mutation_type text not null,
  queue_id bigint,
  latency_ms integer,
  result text not null default 'success',
  conflict_reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pos_sync_events_device_created_idx
  on pos_sync_events (device_id, created_at desc);

create index if not exists pos_sync_events_result_idx
  on pos_sync_events (result);

-- Optional helper: record a sync event from RPC/REST endpoints
create or replace function log_pos_sync_event(
  p_device_id text,
  p_mutation_type text,
  p_queue_id bigint,
  p_latency_ms integer,
  p_result text,
  p_conflict_reason text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
as $$
begin
  insert into pos_sync_events (
    device_id,
    mutation_type,
    queue_id,
    latency_ms,
    result,
    conflict_reason,
    metadata
  ) values (
    p_device_id,
    p_mutation_type,
    p_queue_id,
    p_latency_ms,
    coalesce(p_result, 'success'),
    p_conflict_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

-- View summarizing current pending stats per device (to back dashboards)
create or replace view pos_sync_event_rollups as
select
  device_id,
  count(*) filter (where created_at > now() - interval '5 minutes') as events_last_5m,
  count(*) filter (where result <> 'success') as failure_count,
  avg(latency_ms) as avg_latency_ms,
  max(created_at) as last_event_at
from pos_sync_events
where created_at > now() - interval '1 day'
group by device_id;
