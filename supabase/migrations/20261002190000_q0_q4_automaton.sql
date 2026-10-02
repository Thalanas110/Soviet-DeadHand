begin;

-- The automaton in pseudocode.txt is the source of truth:
-- Q0 monitoring -> Q1 safe challenge -> Q2 location challenge -> Q3 attention
-- -> Q4 liveliness alert. Password responses are deliberately classified on the
-- server so incorrect passwords cannot be distinguished from duress passwords.
alter type public.safety_state rename value 'NORMAL' to 'Q0';
alter type public.safety_state rename value 'ARE_YOU_ALIVE' to 'Q1';
alter type public.safety_state rename value 'PROLONGED_NO_RESPONSE' to 'Q2';
alter type public.safety_state rename value 'CRITICAL_UNRESOLVED' to 'Q3';
alter type public.safety_state rename value 'RESOLVED' to 'Q4';

alter table public.safety_status
  alter column state set default 'Q0'::public.safety_state;

-- Rows that were previously RESOLVED have no active incident and belong back in
-- the accepting monitoring state. Active Q4 rows are preserved.
update public.safety_status
set state = 'Q0', state_entered_at = now(), updated_at = now()
where state = 'Q4' and active_incident_id is null;

-- Q4 is a liveliness-alert state, not a resolved state. The old RESOLVED enum
-- value is renamed in place to preserve existing rows and foreign keys.
create or replace function public._transition(
  _user uuid,
  _to public.safety_state,
  _rule text,
  _incident uuid,
  _device uuid,
  _heartbeat uuid,
  _actor text,
  _details jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  _from public.safety_state;
  _covert boolean := _rule like 'DURESS%' or _actor like 'operator:duress%';
begin
  select state into _from from safety_status where user_id = _user for update;
  if _from is null then raise exception 'NO_STATUS'; end if;
  if not ((_from::text || '>' || _to::text) = any (array[
    'Q0>Q1', 'Q0>Q3',
    'Q1>Q0', 'Q1>Q2', 'Q1>Q3',
    'Q2>Q0', 'Q2>Q3',
    'Q3>Q4',
    'Q4>Q1'
  ])) then
    raise exception 'ILLEGAL_TRANSITION % -> %', _from, _to;
  end if;

  update safety_status
  set state = _to,
      state_entered_at = now(),
      updated_at = now(),
      active_incident_id = case when _to = 'Q0' then null else coalesce(active_incident_id, _incident) end
  where user_id = _user;

  if _incident is not null then
    if _to = 'Q0' then
      update incidents
      set state = 'Q0', resolved_at = coalesce(resolved_at, now()), resolution = coalesce(resolution, _rule)
      where id = _incident;
    else
      update incidents set state = _to where id = _incident;
    end if;
  end if;

  insert into incident_events(user_id, incident_id, prev_state, new_state, rule, device_id, heartbeat_id, actor, details, covert)
  values (_user, _incident, _from, _to, _rule, _device, _heartbeat, _actor, coalesce(_details, '{}'::jsonb), _covert);
end $$;

create or replace function public._heartbeat_ok(_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (
      select 1 from devices d
      where d.user_id = _user and d.kind = 'phone' and d.revoked_at is null
        and d.last_seen_at >= now() - interval '24 hours'
    )
    and exists (
      select 1 from devices d
      where d.user_id = _user and d.kind = 'wearable' and d.revoked_at is null
        and d.last_seen_at >= now() - interval '24 hours'
    )
    and exists (
      select 1 from heartbeats h
      where h.user_id = _user and h.complete and h.received_at >= now() - interval '24 hours'
    )
$$;

create or replace function public._ingest(
  _user uuid,
  _device uuid,
  _seq bigint,
  _client_ts timestamptz,
  _battery int,
  _charging boolean,
  _network text,
  _wearable boolean,
  _loc_enc text,
  _loc_iv text,
  _loc_acc double precision,
  _loc_ts timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d devices;
  _hb uuid;
  _complete boolean;
  st safety_status;
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

  update devices
  set last_seq = _seq,
      last_seen_at = now(),
      last_complete_at = case when _complete then now() else last_complete_at end
  where id = _device;
  update safety_status
  set last_any_heartbeat_at = now(),
      last_complete_heartbeat_at = case when _complete then now() else last_complete_heartbeat_at end,
      updated_at = now()
  where user_id = _user returning * into st;

  -- Q1 can be cancelled by a complete h event. Q2 explicitly exits only on a response.
  if public._heartbeat_ok(_user) and st.state = 'Q1' then
    perform public._transition(_user, 'Q0', 'COMPLETE_HEARTBEAT_RECEIVED', st.active_incident_id, _device, _hb, 'device:' || _device);
  end if;
  return jsonb_build_object('heartbeat_id', _hb, 'complete', _complete);
end $$;

create or replace function public._open_duress(_user uuid, _device uuid, _hb uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  _inc uuid;
  st safety_status;
begin
  select * into st from safety_status where user_id = _user for update;
  select id into _inc from incidents where user_id = _user and covert and resolved_at is null limit 1;
  if _inc is null then
    insert into incidents(user_id, trigger, covert, state, escalated_at)
    values (_user, 'DURESS', true, 'Q3', now()) returning id into _inc;
    update safety_status set active_incident_id = _inc where user_id = _user;
  end if;

  if st.state in ('Q0', 'Q1', 'Q2') then
    perform public._transition(_user, 'Q3', 'DURESS_CODE_ENTERED', _inc, _device, _hb, 'operator:duress');
  elsif st.state = 'Q3' then
    perform public._transition(_user, 'Q4', 'DURESS_CODE_ENTERED', _inc, _device, _hb, 'operator:duress');
  else
    update incidents set state = 'Q4' where id = _inc;
    update safety_status set state_entered_at = now(), updated_at = now() where user_id = _user;
    insert into incident_events(user_id, incident_id, rule, actor, details, covert)
    values (_user, _inc, 'DURESS_CODE_ENTERED', 'operator:duress', '{}', true);
  end if;
  perform public._execute_cascade(_inc);
end $$;

create or replace function public._respond(_user uuid, _response text, _device uuid, _hb uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  st safety_status;
begin
  select * into st from safety_status where user_id = _user for update;
  if _response = 'DURESS' then
    perform public._open_duress(_user, _device, _hb);
  elsif _response = 'CORRECT' then
    if st.state in ('Q1', 'Q2') then
      perform public._transition(_user, 'Q0', 'CORRECT_RESPONSE', st.active_incident_id, _device, _hb, 'operator');
    elsif st.state = 'Q3' then
      perform public._transition(_user, 'Q4', 'CORRECT_RESPONSE', st.active_incident_id, _device, _hb, 'operator');
    elsif st.state = 'Q4' then
      perform public._transition(_user, 'Q1', 'CORRECT_RESPONSE', st.active_incident_id, _device, _hb, 'operator');
    end if;
  elsif _response = 'UNSAFE' and st.state = 'Q4' then
    update safety_status set state_entered_at = now(), updated_at = now() where user_id = _user;
    insert into incident_events(user_id, incident_id, rule, actor, details)
    values (_user, st.active_incident_id, 'UNSAFE_REPORT', 'operator', '{}');
  end if;
end $$;

create or replace function public._visible_checkin(_user uuid, _device uuid, _hb uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._respond(_user, 'CORRECT', _device, _hb);
end $$;

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
  return 'DURESS';
end $$;

create or replace function public.api_checkin(
  _user uuid, _device uuid, _seq bigint, _client_ts timestamptz, _battery int, _charging boolean,
  _network text, _wearable boolean, _loc_enc text, _loc_iv text, _loc_acc double precision,
  _loc_ts timestamptz, _pin text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  _cls text;
  _r jsonb;
  _hb uuid;
begin
  _cls := public._classify_pin(_user, _pin);
  if _cls = 'UNCONFIGURED' then return jsonb_build_object('ok', false, 'error', 'PINS_NOT_CONFIGURED'); end if;
  begin
    _r := public._ingest(_user, _device, _seq, _client_ts, _battery, _charging, _network, _wearable, _loc_enc, _loc_iv, _loc_acc, _loc_ts);
    _hb := (_r->>'heartbeat_id')::uuid;
  exception when others then
    if _cls <> 'DURESS' then return jsonb_build_object('ok', false, 'error', sqlerrm); end if;
  end;

  if _cls = 'DURESS' then
    perform public._open_duress(_user, _device, _hb);
  else
    perform public._respond(_user, 'CORRECT', _device, _hb);
  end if;
  -- Correct and duress responses intentionally return the same acknowledgement shape.
  return jsonb_build_object('ok', true, 'acknowledged_at', now());
end $$;

create or replace function public.api_silent_alarm(_user uuid, _device uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._open_duress(_user, _device, null);
  return jsonb_build_object('ok', true, 'acknowledged_at', now());
end $$;

create or replace function public.api_set_armed(_user uuid, _armed boolean, _pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  _cls text;
  st safety_status;
begin
  _cls := public._classify_pin(_user, _pin);
  if _cls = 'UNCONFIGURED' then return jsonb_build_object('ok', false, 'error', 'PINS_NOT_CONFIGURED'); end if;
  if _cls = 'DURESS' then
    perform public._open_duress(_user, null, null);
    return jsonb_build_object('ok', true, 'acknowledged_at', now());
  end if;
  select * into st from safety_status where user_id = _user for update;
  if not _armed and st.state <> 'Q0' then
    return jsonb_build_object('ok', false, 'error', 'CHECK_IN_BEFORE_DISARM');
  end if;
  update safety_status set armed = _armed, armed_at = case when _armed then now() else armed_at end, updated_at = now() where user_id = _user;
  insert into incident_events(user_id, rule, actor, details) values (_user, case when _armed then 'ARMED' else 'DISARMED' end, 'operator', '{}');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_stand_down(_user uuid, _pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare _cls text;
begin
  _cls := public._classify_pin(_user, _pin);
  if _cls = 'UNCONFIGURED' then return jsonb_build_object('ok', false, 'error', 'PINS_NOT_CONFIGURED'); end if;
  if _cls = 'DURESS' then
    perform public._open_duress(_user, null, null);
    return jsonb_build_object('ok', true, 'acknowledged_at', now());
  end if;
  update incidents set state = 'Q0', resolved_at = now(), resolution = 'OPERATOR_STAND_DOWN'
  where user_id = _user and covert and resolved_at is null;
  update safety_status set state = 'Q0', state_entered_at = now(), active_incident_id = null, updated_at = now() where user_id = _user;
  insert into incident_events(user_id, rule, actor, details, covert) values (_user, 'DURESS_STAND_DOWN', 'operator', '{}', true);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.api_unsafe_report(_user uuid, _device uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public._respond(_user, 'UNSAFE', _device, null);
  return jsonb_build_object('ok', true, 'acknowledged_at', now());
end $$;

create or replace function public.run_watchdog() returns int
language plpgsql security definer set search_path = public as $$
declare
  r safety_status;
  _inc uuid;
  _n int := 0;
begin
  for r in select * from safety_status where armed for update skip locked loop
    if r.state = 'Q0' and coalesce(r.last_any_heartbeat_at, r.armed_at, r.state_entered_at) < now() - interval '24 hours' then
      insert into incidents(user_id, trigger, state) values (r.user_id, 'WATCHDOG', 'Q1') returning id into _inc;
      update safety_status set active_incident_id = _inc where user_id = r.user_id;
      perform public._transition(r.user_id, 'Q1', 'NO_SIGNAL_24H', _inc, null, null, 'system:watchdog', jsonb_build_object('correlation', public._correlation(r.user_id)));
      _n := _n + 1;
    elsif r.state = 'Q1' and public._heartbeat_ok(r.user_id) then
      perform public._transition(r.user_id, 'Q0', 'HEARTBEAT_RESTORED', r.active_incident_id, null, null, 'system:watchdog', '{}');
      _n := _n + 1;
    elsif r.state = 'Q1' and r.state_entered_at < now() - interval '72 hours' then
      perform public._transition(r.user_id, 'Q2', 'NO_SAFE_RESPONSE_72H', r.active_incident_id, null, null, 'system:watchdog', '{}');
      _n := _n + 1;
    elsif r.state = 'Q2' and r.state_entered_at < now() - interval '48 hours' then
      perform public._transition(r.user_id, 'Q3', 'NO_LOCATION_RESPONSE_48H', r.active_incident_id, null, null, 'system:watchdog', '{}');
      update incidents set escalated_at = now() where id = r.active_incident_id;
      perform public._execute_cascade(r.active_incident_id);
      _n := _n + 1;
    elsif r.state = 'Q3' and r.state_entered_at < now() - interval '120 hours' then
      update safety_status set state_entered_at = now(), updated_at = now() where user_id = r.user_id;
      insert into incident_events(user_id, incident_id, rule, actor, details)
      values (r.user_id, r.active_incident_id, 'RESEND_ATTENTION_ALERT', 'system:watchdog', '{}');
      perform public._execute_cascade(r.active_incident_id);
      _n := _n + 1;
    elsif r.state = 'Q4' and r.state_entered_at < now() - interval '120 hours' then
      update safety_status set state_entered_at = now(), updated_at = now() where user_id = r.user_id;
      insert into incident_events(user_id, incident_id, rule, actor, details)
      values (r.user_id, r.active_incident_id, 'LIVELINESS_ALERT_CYCLE', 'system:watchdog', '{}');
      perform public._execute_cascade(r.active_incident_id);
      _n := _n + 1;
    end if;
  end loop;

  perform public._execute_cascade(i.id) from incidents i where i.covert and i.resolved_at is null;
  return _n;
end $$;

grant execute on function public._heartbeat_ok(uuid) to service_role;
grant execute on function public._respond(uuid, text, uuid, uuid) to service_role;
grant execute on function public.api_unsafe_report(uuid, uuid) to service_role;

commit;
