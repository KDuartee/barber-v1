-- La web pública solo necesita los bloqueos de los próximos 14 días.
create or replace function public.get_public_blocked_dates()
returns table (blocked_date date, reason text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocked_date, nullif(btrim(b.reason), '') as reason
  from public.blocked_dates as b
  where b.blocked_date >= (now() at time zone 'America/Hermosillo')::date
    and b.blocked_date < (now() at time zone 'America/Hermosillo')::date + 14
  order by b.blocked_date;
$$;

revoke all on function public.get_public_blocked_dates() from public;
grant execute on function public.get_public_blocked_dates() to anon, authenticated;

-- La comprobación final evita registrar citas en días bloqueados incluso
-- desde una pestaña antigua o una llamada directa a create_appointment.
create or replace function public.reject_blocked_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from 'cancelled' and exists (
    select 1 from public.blocked_dates as b
    where b.blocked_date = new.appointment_date
  ) then
    raise exception 'Día bloqueado para reservas' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_blocked_appointment() from public, anon, authenticated;

create trigger reject_blocked_appointment_on_insert
before insert on public.appointments
for each row execute function public.reject_blocked_appointment();
