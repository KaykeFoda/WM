-- Run in the Supabase SQL Editor as the project owner.
-- Public clients may execute the two RPCs below, but cannot read/write tables.
begin;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

create table public.wm_barbers (
 id text primary key,
 name text not null,
 active boolean not null default true
);
insert into public.wm_barbers(id,name) values ('negraauu','Negraauu'),('will','Will');
create table public.wm_services (
 id text primary key,
 name text not null,
 price_cents integer not null check(price_cents>=0),
 duration_minutes integer not null check(duration_minutes in (60,120)),
 active boolean not null default true
);
insert into public.wm_services(id,name,price_cents,duration_minutes) values
 ('corte-social','Corte social',3000,60),
 ('corte-degrade','Corte degradê',4000,60),
 ('navalhado','Navalhado',5000,60),
 ('barba','Barba',2000,60),
 ('sobrancelha','Sobrancelha',1000,60),
 ('alisamento','Aliza',10000,120),
 ('luzes','Luzes',12000,60),
 ('progressiva','Progressiva',15000,120),
 ('platinado','Platinado',15000,60),
 ('frizado','Frizado',12000,60),
 ('gel','Gel',1000,60),
 ('pomada','Pomada',2000,60),
 ('penteado','Penteado',2000,60),
 ('pezinho','Pezinho',2000,60),
 ('bigodinho','Bigodinho',1000,60),
 ('corte-penteado','Corte + penteado',6000,60),
 ('combo-wm','Combo WM — corte + barba + sobrancelha',7500,60),
 ('corte-completo','Corte completo — corte + barba + sobrancelha + penteado',7500,60);

create table public.wm_bookings (
 id uuid primary key,
 barber_id text not null references public.wm_barbers(id),
 service_id text not null references public.wm_services(id),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 status text not null default 'booked' check(status in ('booked','cancelled')),
 created_at timestamptz not null default now(),
 check(ends_at>starts_at),
 -- The database itself prevents races, including requests from different devices.
 constraint wm_no_overlap exclude using gist (
   barber_id with =,
   tstzrange(starts_at,ends_at,'[)') with &&
 ) where (status='booked')
);
create index wm_bookings_day on public.wm_bookings(barber_id,starts_at) where status='booked';
alter table public.wm_barbers enable row level security;
alter table public.wm_services enable row level security;
alter table public.wm_bookings enable row level security;
revoke all on public.wm_barbers,public.wm_services,public.wm_bookings from public,anon,authenticated;

create function public.wm_availability(p_barber text,p_service text,p_day date)
returns table(starts_at timestamptz,ends_at timestamptz,available boolean)
language plpgsql security definer set search_path='' as $$
declare duration integer; opening timestamptz; closing timestamptz;
begin
 if p_day is null or p_day<(now() at time zone 'America/Sao_Paulo')::date
    or p_day>(now() at time zone 'America/Sao_Paulo')::date+60
    or extract(isodow from p_day) not between 2 and 6 then return; end if;
 if not exists(select 1 from public.wm_barbers where id=p_barber and active) then return; end if;
 select duration_minutes into duration from public.wm_services where id=p_service and active;
 if not found then return; end if;
 opening := (p_day+time '10:00') at time zone 'America/Sao_Paulo';
 closing := (p_day+time '21:00') at time zone 'America/Sao_Paulo';
 return query select s,s+make_interval(mins=>duration),s>now() and not exists (
   select 1 from public.wm_bookings b where b.barber_id=p_barber and b.status='booked'
   and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(s,s+make_interval(mins=>duration),'[)')
 ) from generate_series(opening,closing-make_interval(mins=>duration),interval '30 minutes') as slots(s);
end;
$$;

create function public.wm_reserve(p_request_id uuid,p_barber text,p_service text,p_start timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare service public.wm_services%rowtype; booking public.wm_bookings%rowtype;
 local_start timestamp; closing timestamptz; ending timestamptz;
begin
 if p_request_id is null or p_start is null then raise exception 'INVALID_REQUEST'; end if;
 -- Serialize retries of the same request, without serializing different barbers.
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into booking from public.wm_bookings where id=p_request_id;
 if found then
   if booking.barber_id is distinct from p_barber or booking.service_id is distinct from p_service
      or booking.starts_at is distinct from p_start or booking.status<>'booked' then
     raise exception 'INVALID_REQUEST';
   end if;
 else
   select * into service from public.wm_services where id=p_service and active;
   if not found or not exists(select 1 from public.wm_barbers where id=p_barber and active) then
     raise exception 'INVALID_SERVICE';
   end if;
   local_start := p_start at time zone 'America/Sao_Paulo';
   ending := p_start+make_interval(mins=>service.duration_minutes);
   closing := (local_start::date+time '21:00') at time zone 'America/Sao_Paulo';
   if p_start<=now() or local_start::date>(now() at time zone 'America/Sao_Paulo')::date+60
     or extract(isodow from local_start) not between 2 and 6
     or local_start::time<time '10:00' or ending>closing
     or extract(minute from local_start)::integer%30<>0
     or extract(second from local_start)<>0 then raise exception 'INVALID_TIME'; end if;
   begin
     insert into public.wm_bookings(id,barber_id,service_id,starts_at,ends_at)
     values(p_request_id,p_barber,p_service,p_start,ending) returning * into booking;
   exception when exclusion_violation then raise exception 'SLOT_TAKEN'; end;
 end if;
 select * into service from public.wm_services where id=booking.service_id;
 return jsonb_build_object('id',booking.id,'barber_id',booking.barber_id,
  'service_id',booking.service_id,'service_name',service.name,'price_cents',service.price_cents,
  'starts_at',booking.starts_at,'ends_at',booking.ends_at);
end;
$$;
revoke all on function public.wm_availability(text,text,date) from public;
revoke all on function public.wm_reserve(uuid,text,text,timestamptz) from public;
grant execute on function public.wm_availability(text,text,date) to anon;
grant execute on function public.wm_reserve(uuid,text,text,timestamptz) to anon;
commit;
