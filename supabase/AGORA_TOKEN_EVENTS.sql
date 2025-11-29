-- Lightweight log table for Agora token requests
create table if not exists public.agora_token_events (
  id bigserial primary key,
  user_id uuid not null,
  channel text not null,
  role text not null check (role in ('PUBLISHER','SUBSCRIBER')),
  duration_ms integer,
  success boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_agora_token_events_user_created
  on public.agora_token_events (user_id, created_at desc);
