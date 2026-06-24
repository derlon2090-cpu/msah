create extension if not exists "pgcrypto";

create table if not exists public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_name text,
  total_uses integer not null check (total_uses >= 0),
  remaining_uses integer not null check (remaining_uses >= 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.processed_images (
  id uuid primary key default gen_random_uuid(),
  activation_code_id uuid not null references public.activation_codes(id) on delete cascade,
  original_url text not null,
  result_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists activation_codes_code_idx on public.activation_codes (code);
create index if not exists processed_images_activation_code_id_idx on public.processed_images (activation_code_id);
create index if not exists processed_images_created_at_idx on public.processed_images (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists activation_codes_updated_at on public.activation_codes;
create trigger activation_codes_updated_at
before update on public.activation_codes
for each row execute function public.set_updated_at();

insert into public.activation_codes (
  code,
  customer_name,
  total_uses,
  remaining_uses,
  expires_at,
  is_active,
  notes
)
values (
  'DEMO-2026',
  'عميل تجريبي',
  20,
  18,
  null,
  true,
  'كود مبدئي لتجربة المحرر'
)
on conflict (code) do nothing;
