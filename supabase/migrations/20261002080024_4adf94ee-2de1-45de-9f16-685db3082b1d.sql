create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

create type public.safety_state as enum ('NORMAL','ARE_YOU_ALIVE','PROLONGED_NO_RESPONSE','CRITICAL_UNRESOLVED','RESOLVED');
create type public.device_kind as enum ('phone','wearable');

-- PROFILES
create table public.profiles (
  id uuid primary key,
  callsign text not null default 'OPERATOR',
  checkin_pin_hash text,
  duress_pin_hash text,
  pins_configured boolean not null default false,
  failed_pin_attempts int not null default 0,
  created_at timestamptz not null default now()
);
grant select (id, callsign, pins_configured, created_at) on public.profiles to authenticated;
grant update (callsign) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile callsign" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- SAFETY STATUS
create table public.safety_status (
  user_id uuid primary key,
  state public.safety_state not null default 'NORMAL',
  armed boolean not null default false,
  armed_at timestamptz,
  state_entered_at timestamptz not null default now(),
  last_complete_heartbeat_at timestamptz,
  last_any_heartbeat_at timestamptz,
  active_incident_id uuid,
  updated_at timestamptz not null default now()
);
grant select on public.safety_status to authenticated;
grant all on public.safety_status to service_role;
alter table public.safety_status enable row level security;
create policy "own status read" on public.safety_status for select to authenticated using (auth.uid() = user_id);

-- DEVICES
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  kind public.device_kind not null,
  token_hash text not null unique,
  last_seq bigint not null default 0,
  last_seen_at timestamptz,
  last_complete_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on public.devices(user_id);
grant select (id, user_id, label, kind, last_seq, last_seen_at, last_complete_at, created_at, revoked_at) on public.devices to authenticated;
grant all on public.devices to service_role;
alter table public.devices enable row level security;
create policy "own devices read" on public.devices for select to authenticated using (auth.uid() = user_id);

-- HEARTBEATS (immutable)
create table public.heartbeats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_id uuid not null references public.devices(id),
  seq bigint not null,
  client_ts timestamptz,
  received_at timestamptz not null default now(),
  complete boolean not null,
  battery int,
  charging boolean,
  network text,
  wearable_connected boolean,
  location_enc text,
  location_iv text,
  location_accuracy double precision,
  location_ts timestamptz,
  unique (device_id, seq)
);
create index on public.heartbeats(user_id, received_at desc);
grant select on public.heartbeats to authenticated;
grant all on public.heartbeats to service_role;
alter table public.heartbeats enable row level security;
create policy "own heartbeats read" on public.heartbeats for select to authenticated using (auth.uid() = user_id);

-- INCIDENTS
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trigger text not null check (trigger in ('WATCHDOG','DURESS')),
  covert boolean not null default false,
  state public.safety_state not null,
  opened_at timestamptz not null default now(),
  escalated_at timestamptz,
  resolved_at timestamptz,
  resolution text
);
create index on public.incidents(user_id, opened_at desc);
grant select on public.incidents to authenticated;
grant all on public.incidents to service_role;
alter table public.incidents enable row level security;
create policy "own visible incidents" on public.incidents for select to authenticated using (auth.uid() = user_id and (not covert or resolved_at is not null));

-- INCIDENT EVENTS (immutable ledger)
create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  incident_id uuid,
  prev_state public.safety_state,
  new_state public.safety_state,
  rule text not null,
  device_id uuid,
  heartbeat_id uuid,
  actor text not null,
  details jsonb not null default '{}'::jsonb,
  covert boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.incident_events(user_id, created_at desc);
grant select on public.incident_events to authenticated;
grant all on public.incident_events to service_role;
alter table public.incident_events enable row level security;
create policy "own visible events" on public.incident_events for select to authenticated using (auth.uid() = user_id and not covert);

-- EMERGENCY CONTACTS
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  priority int not null check (priority between 1 and 9),
  alias text not null,
  contact_enc text not null,
  contact_iv text not null,
  authorized boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.emergency_contacts(user_id);
grant select, insert, delete on public.emergency_contacts to authenticated;
grant all on public.emergency_contacts to service_role;
alter table public.emergency_contacts enable row level security;
create policy "own contacts read" on public.emergency_contacts for select to authenticated using (auth.uid() = user_id);
create policy "own contacts insert" on public.emergency_contacts for insert to authenticated with check (auth.uid() = user_id);
create policy "own contacts delete" on public.emergency_contacts for delete to authenticated using (auth.uid() = user_id);

-- NOTIFICATION DISPATCHES (idempotent, snapshot immutable)
create table public.notification_dispatches (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id),
  contact_id uuid not null references public.emergency_contacts(id) on delete restrict,
  user_id uuid not null,
  priority int not null,
  status text not null default 'PENDING' check (status in ('PENDING','SENT','FAILED','SKIPPED')),
  snapshot jsonb not null,
  covert boolean not null default false,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (incident_id, contact_id)
);
grant select on public.notification_dispatches to authenticated;
grant all on public.notification_dispatches to service_role;
alter table public.notification_dispatches enable row level security;
create policy "own visible dispatches" on public.notification_dispatches for select to authenticated using (auth.uid() = user_id and not covert);

-- Immutability guards
create or replace function public._block_mutation() returns trigger language plpgsql set search_path = public as $$
begin raise exception 'IMMUTABLE_RECORD: % on %', tg_op, tg_table_name; end $$;
create trigger heartbeats_immutable before update or delete on public.heartbeats for each row execute function public._block_mutation();
create trigger events_immutable before update or delete on public.incident_events for each row execute function public._block_mutation();

create or replace function public._guard_dispatch() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'IMMUTABLE_RECORD: dispatch'; end if;
  if new.snapshot is distinct from old.snapshot or new.incident_id <> old.incident_id or new.contact_id <> old.contact_id then
    raise exception 'IMMUTABLE_SNAPSHOT';
  end if;
  return new;
end $$;
create trigger dispatch_guard before update or delete on public.notification_dispatches for each row execute function public._guard_dispatch();

-- Contacts referenced by dispatches cannot be deleted (FK restrict); allow de-authorize instead.

-- ============ DOMAIN FUNCTIONS ============

create or replace function public.bootstrap_operator() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  insert into profiles(id) values (auth.uid()) on conflict do nothing;
  insert into safety_status(user_id) values (auth.uid()) on conflict do nothing;
end $$;

create or replace function public._transition(_user uuid, _to public.safety_state, _rule text, _incident uuid, _device uuid, _heartbeat uuid, _actor text, _details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare _from public.safety_state;
begin
  select state into _from from safety_status where user_id = _user for update;
  if _from is null then raise exception 'NO_STATUS'; end if;
  if not ((_from::text || '>' || _to::text) = any (array[
    'NORMAL>ARE_YOU_ALIVE','RESOLVED>ARE_YOU_ALIVE','ARE_YOU_ALIVE>NORMAL','ARE_YOU_ALIVE>PROLONGED_NO_RESPONSE',
    'PROLONGED_NO_RESPONSE>CRITICAL_UNRESOLVED','PROLONGED_NO_RESPONSE>RESOLVED','CRITICAL_UNRESOLVED>RESOLVED','RESOLVED>NORMAL'])) then
    raise exception 'ILLEGAL_TRANSITION % -> %', _from, _to;
  end if;
  update safety_status set state = _to, state_entered_at = now(), updated_at = now(),
    active_incident_id = case when _to in ('NORMAL','RESOLVED') then null else active_incident_id end
  where user_id = _user;
  if _incident is not null then
    if _to in ('NORMAL','RESOLVED') then
      update incidents set state = 'RESOLVED', resolved_at = coalesce(resolved_at, now()), resolution = coalesce(resolution, _rule) where id = _incident;
    else
      update incidents set state = _to where id = _incident;
    end if;
  end if;
  insert into incident_events(user_id, incident_id, prev_state, new_state, rule, device_id, heartbeat_id, actor, details)
  values (_user, _incident, _from, _to, _rule, _device, _heartbeat, _actor, coalesce(_details, '{}'::jsonb));
end $$;

create or replace function public._correlation(_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  with p as (select max(last_seen_at) t from devices where user_id = _user and kind = 'phone' and revoked_at is null),
       w as (select max(last_seen_at) t, count(*) n from devices where user_id = _user and kind = 'wearable' and revoked_at is null)
  select jsonb_build_object(
    'phone_last_seen', p.t, 'wearable_last_seen', w.t, 'wearable_registered', w.n > 0,
    'phone_lost', p.t is null or p.t < now() - interval '6 hours',
    'wearable_lost', w.n > 0 and (w.t is null or w.t < now() - interval '6 hours'),
    'loss_gap_minutes', case when p.t is not null and w.t is not null then round(extract(epoch from (p.t - w.t)) / 60) end,
    'pattern', case
      when (p.t is null or p.t < now() - interval '6 hours') and w.n > 0 and (w.t is null or w.t < now() - interval '6 hours') then 'CORRELATED_LOSS'
      when (p.t is null or p.t < now() - interval '6 hours') then 'PHONE_LOSS'
      when w.n > 0 and (w.t is null or w.t < now() - interval '6 hours') then 'WEARABLE_LOSS'
      else 'NOMINAL' end)
  from p, w
$$;

create or replace function public._snapshot(_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'captured_at', now(),
    'last_complete', (select to_jsonb(x) from (select h.id, h.device_id, h.received_at, h.battery, h.charging, h.network, h.location_enc, h.location_iv, h.location_accuracy, h.location_ts
        from heartbeats h where h.user_id = _user and h.complete order by h.received_at desc limit 1) x),
    'last_any', (select to_jsonb(x) from (select h.id, h.device_id, h.received_at, h.battery, h.network, h.wearable_connected
        from heartbeats h where h.user_id = _user order by h.received_at desc limit 1) x),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'label', d.label, 'kind', d.kind, 'last_seen_at', d.last_seen_at, 'last_complete_at', d.last_complete_at)), '[]'::jsonb)
        from devices d where d.user_id = _user and d.revoked_at is null),
    'correlation', public._correlation(_user))
$$;

create or replace function public._execute_cascade(_incident uuid) returns int
language plpgsql security definer set search_path = public as $$
declare _n int; _u uuid; _covert boolean;
begin
  select user_id, covert into _u, _covert from incidents where id = _incident;
  if _u is null then return 0; end if;
  insert into notification_dispatches(incident_id, contact_id, user_id, priority, snapshot, covert)
  select _incident, c.id, _u, c.priority, public._snapshot(_u), _covert
  from emergency_contacts c where c.user_id = _u and c.authorized
  on conflict (incident_id, contact_id) do nothing;
  get diagnostics _n = row_count;
  if _n > 0 then
    insert into incident_events(user_id, incident_id, rule, actor, details, covert)
    values (_u, _incident, 'EXECUTE_EMERGENCY_NOTIFICATION_CASCADE', 'system:cascade', jsonb_build_object('dispatches_created', _n), _covert);
  end if;
  return _n;
end $$;

create or replace function public._ingest(_user uuid, _device uuid, _seq bigint, _client_ts timestamptz, _battery int, _charging boolean, _network text, _wearable boolean, _loc_enc text, _loc_iv text, _loc_acc double precision, _loc_ts timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d devices; _hb uuid; _complete boolean; st safety_status;
begin
  select * into d from devices where id = _device and user_id = _user for update;
  if not found or d.revoked_at is not null then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  if _seq <= d.last_seq then raise exception 'REPLAY_REJECTED'; end if;
  _complete := _loc_enc is not null and _loc_iv is not null and _loc_acc is not null and _loc_acc > 0 and _loc_acc <= 5000
    and _loc_ts is not null and _loc_ts between now() - interval '10 minutes' and now() + interval '2 minutes';
  insert into heartbeats(user_id, device_id, seq, client_ts, complete, battery, charging, network, wearable_connected, location_enc, location_iv, location_accuracy, location_ts)
  values (_user, _device, _seq, _client_ts, _complete, _battery, _charging, _network, _wearable,
    case when _complete then _loc_enc end, case when _complete then _loc_iv end, case when _complete then _loc_acc end, case when _complete then _loc_ts end)
  returning id into _hb;
  update devices set last_seq = _seq, last_seen_at = now(), last_complete_at = case when _complete then now() else last_complete_at end where id = _device;
  update safety_status set last_any_heartbeat_at = now(),
    last_complete_heartbeat_at = case when _complete then now() else last_complete_heartbeat_at end, updated_at = now()
  where user_id = _user returning * into st;
  if _complete and st.state = 'ARE_YOU_ALIVE' then
    perform public._transition(_user, 'NORMAL', 'COMPLETE_HEARTBEAT_RECEIVED', st.active_incident_id, _device, _hb, 'device:' || _device);
  end if;
  return jsonb_build_object('heartbeat_id', _hb, 'complete', _complete);
end $$;

create or replace function public._open_duress(_user uuid, _device uuid, _hb uuid) returns void
language plpgsql security definer set search_path = public as $$
declare _inc uuid;
begin
  select id into _inc from incidents where user_id = _user and covert and resolved_at is null limit 1;
  if _inc is null then
    insert into incidents(user_id, trigger, covert, state, escalated_at) values (_user, 'DURESS', true, 'CRITICAL_UNRESOLVED', now()) returning id into _inc;
    insert into incident_events(user_id, incident_id, new_state, rule, device_id, heartbeat_id, actor, details, covert)
    values (_user, _inc, 'CRITICAL_UNRESOLVED', 'DURESS_CODE_ENTERED', _device, _hb, 'operator:duress', jsonb_build_object('correlation', public._correlation(_user)), true);
  end if;
  perform public._execute_cascade(_inc);
end $$;

create or replace function public._visible_checkin(_user uuid, _device uuid, _hb uuid) returns void
language plpgsql security definer set search_path = public as $$
declare st safety_status;
begin
  select * into st from safety_status where user_id = _user;
  if st.state = 'ARE_YOU_ALIVE' or st.state = 'RESOLVED' then
    perform public._transition(_user, 'NORMAL', 'OPERATOR_CHECKIN', st.active_incident_id, _device, _hb, 'operator');
  elsif st.state in ('PROLONGED_NO_RESPONSE','CRITICAL_UNRESOLVED') then
    perform public._transition(_user, 'RESOLVED', 'OPERATOR_CHECKIN', st.active_incident_id, _device, _hb, 'operator');
  end if;
end $$;

-- Returns a pin classification: 'CHECKIN', 'DURESS', or 'REJECTED'
create or replace function public._classify_pin(_user uuid, _pin text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare p profiles;
begin
  select * into p from profiles where id = _user for update;
  if p.id is null or not p.pins_configured then return 'UNCONFIGURED'; end if;
  if p.duress_pin_hash = extensions.crypt(_pin, p.duress_pin_hash) then
    update profiles set failed_pin_attempts = 0 where id = _user; return 'DURESS';
  elsif p.checkin_pin_hash = extensions.crypt(_pin, p.checkin_pin_hash) then
    update profiles set failed_pin_attempts = 0 where id = _user; return 'CHECKIN';
  end if;
  update profiles set failed_pin_attempts = failed_pin_attempts + 1 where id = _user;
  return 'REJECTED';
end $$;

create or replace function public.api_checkin(_user uuid, _device uuid, _seq bigint, _client_ts timestamptz, _battery int, _charging boolean, _network text, _wearable boolean, _loc_enc text, _loc_iv text, _loc_acc double precision, _loc_ts timestamptz, _pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _cls text; _r jsonb; _hb uuid; _complete boolean;
begin
  _cls := public._classify_pin(_user, _pin);
  if _cls = 'UNCONFIGURED' then return jsonb_build_object('ok', false, 'error', 'PINS_NOT_CONFIGURED'); end if;
  if _cls = 'REJECTED' then return jsonb_build_object('ok', false, 'error', 'PIN_REJECTED'); end if;
  begin
    _r := public._ingest(_user, _device, _seq, _client_ts, _battery, _charging, _network, _wearable, _loc_enc, _loc_iv, _loc_acc, _loc_ts);
    _hb := (_r->>'heartbeat_id')::uuid; _complete := (_r->>'complete')::boolean;
  exception when others then
    if _cls <> 'DURESS' then return jsonb_build_object('ok', false, 'error', sqlerrm); end if;
    _hb := null; _complete := false;
  end;
  if _cls = 'DURESS' then perform public._open_duress(_user, _device, _hb); end if;
  if not _complete then return jsonb_build_object('ok', false, 'error', 'LOCATION_REQUIRED'); end if;
  perform public._visible_checkin(_user, _device, _hb);
  return jsonb_build_object('ok', true, 'acknowledged_at', now());
end $$;

create or replace function public.api_silent_alarm(_user uuid, _device uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._open_duress(_user, _device, null);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_set_pins(_user uuid, _current text, _checkin text, _duress text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare p profiles;
begin
  select * into p from profiles where id = _user for update;
  if p.id is null then return jsonb_build_object('ok', false, 'error', 'NO_PROFILE'); end if;
  if _checkin = _duress then return jsonb_build_object('ok', false, 'error', 'PINS_MUST_DIFFER'); end if;
  if p.pins_configured and (p.checkin_pin_hash <> extensions.crypt(coalesce(_current, ''), p.checkin_pin_hash)) then
    return jsonb_build_object('ok', false, 'error', 'PIN_REJECTED');
  end if;
  update profiles set checkin_pin_hash = extensions.crypt(_checkin, extensions.gen_salt('bf', 10)),
    duress_pin_hash = extensions.crypt(_duress, extensions.gen_salt('bf', 10)), pins_configured = true, failed_pin_attempts = 0
  where id = _user;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_set_armed(_user uuid, _armed boolean, _pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare _cls text; st safety_status;
begin
  _cls := public._classify_pin(_user, _pin);
  if _cls in ('UNCONFIGURED','REJECTED') then return jsonb_build_object('ok', false, 'error', case when _cls = 'UNCONFIGURED' then 'PINS_NOT_CONFIGURED' else 'PIN_REJECTED' end); end if;
  if _cls = 'DURESS' then perform public._open_duress(_user, null, null); end if;
  select * into st from safety_status where user_id = _user for update;
  if not _armed and st.state not in ('NORMAL','RESOLVED') then
    return jsonb_build_object('ok', false, 'error', 'CHECK_IN_BEFORE_DISARM');
  end if;
  update safety_status set armed = _armed, armed_at = case when _armed then now() else armed_at end, updated_at = now() where user_id = _user;
  insert into incident_events(user_id, rule, actor, details) values (_user, case when _armed then 'ARMED' else 'DISARMED' end, 'operator', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_stand_down(_user uuid, _pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare _cls text;
begin
  _cls := public._classify_pin(_user, _pin);
  if _cls <> 'CHECKIN' and _cls <> 'DURESS' then return jsonb_build_object('ok', false, 'error', 'PIN_REJECTED'); end if;
  if _cls = 'CHECKIN' then
    update incidents set state = 'RESOLVED', resolved_at = now(), resolution = 'OPERATOR_STAND_DOWN' where user_id = _user and covert and resolved_at is null;
    insert into incident_events(user_id, rule, actor, details, covert) values (_user, 'DURESS_STAND_DOWN', 'operator', '{}'::jsonb, true);
  else
    perform public._open_duress(_user, null, null);
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_ingest_device(_token_hash text, _seq bigint, _client_ts timestamptz, _battery int, _charging boolean, _network text, _wearable boolean, _loc_enc text, _loc_iv text, _loc_acc double precision, _loc_ts timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d devices;
begin
  select * into d from devices where token_hash = _token_hash and revoked_at is null;
  if d.id is null then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  return public._ingest(d.user_id, d.id, _seq, _client_ts, _battery, _charging, _network, _wearable, _loc_enc, _loc_iv, _loc_acc, _loc_ts);
end $$;

create or replace function public.run_watchdog() returns int
language plpgsql security definer set search_path = public as $$
declare r safety_status; _inc uuid; _n int := 0;
begin
  for r in select * from safety_status where armed for update skip locked loop
    if r.state in ('NORMAL','RESOLVED') and coalesce(r.last_complete_heartbeat_at, r.armed_at, r.state_entered_at) < now() - interval '72 hours' then
      insert into incidents(user_id, trigger, state) values (r.user_id, 'WATCHDOG', 'ARE_YOU_ALIVE') returning id into _inc;
      update safety_status set active_incident_id = _inc where user_id = r.user_id;
      perform public._transition(r.user_id, 'ARE_YOU_ALIVE', 'NO_COMPLETE_HEARTBEAT_72H', _inc, null, null, 'system:watchdog', jsonb_build_object('correlation', public._correlation(r.user_id)));
      _n := _n + 1;
    elsif r.state = 'ARE_YOU_ALIVE' and r.state_entered_at < now() - interval '48 hours' then
      perform public._transition(r.user_id, 'PROLONGED_NO_RESPONSE', 'NO_RESPONSE_48H', r.active_incident_id, null, null, 'system:watchdog', jsonb_build_object('correlation', public._correlation(r.user_id)));
      perform public._transition(r.user_id, 'CRITICAL_UNRESOLVED', 'RELEASE_ALL_MISSILES', r.active_incident_id, null, null, 'system:watchdog', '{}'::jsonb);
      update incidents set escalated_at = now() where id = r.active_incident_id;
      perform public._execute_cascade(r.active_incident_id);
      _n := _n + 1;
    elsif r.state = 'PROLONGED_NO_RESPONSE' then
      perform public._transition(r.user_id, 'CRITICAL_UNRESOLVED', 'RELEASE_ALL_MISSILES', r.active_incident_id, null, null, 'system:watchdog', '{}'::jsonb);
      update incidents set escalated_at = now() where id = r.active_incident_id;
      perform public._execute_cascade(r.active_incident_id);
      _n := _n + 1;
    elsif r.state = 'CRITICAL_UNRESOLVED' and r.active_incident_id is not null then
      perform public._execute_cascade(r.active_incident_id);
    end if;
  end loop;
  -- covert incidents: pick up newly authorized contacts
  perform public._execute_cascade(i.id) from incidents i where i.covert and i.resolved_at is null;
  return _n;
end $$;

-- Lock down: only bootstrap_operator is callable by signed-in users; everything else is server-only.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.bootstrap_operator() to authenticated;
grant execute on all functions in schema public to service_role;

alter publication supabase_realtime add table public.safety_status, public.incidents, public.incident_events, public.heartbeats, public.notification_dispatches, public.devices;