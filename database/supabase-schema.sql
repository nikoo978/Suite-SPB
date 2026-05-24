-- Suite SPB / Recargos y Francos
-- Ejecutar este archivo en Supabase SQL Editor antes de configurar Vercel.

create extension if not exists "pgcrypto";

create table if not exists public.recargos_personal (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.recargos_guardias (
  id uuid primary key default gen_random_uuid(),
  fecha text not null,
  fecha_key date not null unique,
  mes integer generated always as (extract(month from fecha_key)::integer) stored,
  anio integer generated always as (extract(year from fecha_key)::integer) stored,
  oficial text,
  observaciones text,
  creado text,
  recargos jsonb not null default '[]'::jsonb,
  francos jsonb not null default '[]'::jsonb,
  francos_post jsonb not null default '[]'::jsonb,
  novedades jsonb not null default '[]'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists recargos_guardias_mes_anio_idx on public.recargos_guardias (anio, mes);
create index if not exists recargos_guardias_fecha_key_idx on public.recargos_guardias (fecha_key);
create index if not exists recargos_guardias_recargos_gin_idx on public.recargos_guardias using gin (recargos);
create index if not exists recargos_guardias_francos_gin_idx on public.recargos_guardias using gin (francos);
create index if not exists recargos_guardias_novedades_gin_idx on public.recargos_guardias using gin (novedades);

create or replace function public.set_actualizado_en()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_recargos_personal_actualizado_en on public.recargos_personal;
create trigger trg_recargos_personal_actualizado_en
before update on public.recargos_personal
for each row execute function public.set_actualizado_en();

drop trigger if exists trg_recargos_guardias_actualizado_en on public.recargos_guardias;
create trigger trg_recargos_guardias_actualizado_en
before update on public.recargos_guardias
for each row execute function public.set_actualizado_en();

alter table public.recargos_personal enable row level security;
alter table public.recargos_guardias enable row level security;

-- No se crean policies públicas. La app escribe desde API routes del servidor con SUPABASE_SERVICE_ROLE_KEY.
-- Nunca expongas SUPABASE_SERVICE_ROLE_KEY en el navegador.
