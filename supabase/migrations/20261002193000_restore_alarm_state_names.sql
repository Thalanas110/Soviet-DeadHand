begin;

-- Q0-Q4 are automaton node identifiers from automaton.png. They are not the
-- persisted alarm-state names. Keep safety_state semantic and store the node
-- separately so alarm history remains readable and backwards compatible.
do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'deadhand_automaton_state'
  ) then
    create type public.deadhand_automaton_state as enum ('Q0', 'Q1', 'Q2', 'Q3', 'Q4');
  end if;
end $$;

alter table public.safety_status
  add column if not exists automaton_state public.deadhand_automaton_state not null default 'Q0';

-- Capture the q-node values written by the previously shipped migration before
-- restoring the original safety_state enum labels.
update public.safety_status
set automaton_state = case state::text
  when 'Q0' then 'Q0'::public.deadhand_automaton_state
  when 'Q1' then 'Q1'::public.deadhand_automaton_state
  when 'Q2' then 'Q2'::public.deadhand_automaton_state
  when 'Q3' then 'Q3'::public.deadhand_automaton_state
  when 'Q4' then 'Q4'::public.deadhand_automaton_state
  when 'ARE_YOU_ALIVE' then 'Q1'::public.deadhand_automaton_state
  when 'PROLONGED_NO_RESPONSE' then 'Q2'::public.deadhand_automaton_state
  when 'CRITICAL_UNRESOLVED' then 'Q3'::public.deadhand_automaton_state
  else 'Q0'::public.deadhand_automaton_state
end;

do $$
begin
  if exists (select 1 from pg_enum where enumtypid = 'public.safety_state'::regtype and enumlabel = 'Q0') then
    alter type public.safety_state rename value 'Q0' to 'NORMAL';
    alter type public.safety_state rename value 'Q1' to 'ARE_YOU_ALIVE';
    alter type public.safety_state rename value 'Q2' to 'PROLONGED_NO_RESPONSE';
    alter type public.safety_state rename value 'Q3' to 'CRITICAL_UNRESOLVED';
    alter type public.safety_state rename value 'Q4' to 'RESOLVED';
  end if;
end $$;

alter table public.safety_status
  alter column state set default 'NORMAL'::public.safety_state;

update public.safety_status
set state = case automaton_state
  when 'Q0' then 'NORMAL'::public.safety_state
  when 'Q1' then 'ARE_YOU_ALIVE'::public.safety_state
  when 'Q2' then 'PROLONGED_NO_RESPONSE'::public.safety_state
  else 'CRITICAL_UNRESOLVED'::public.safety_state
end,
updated_at = now();

-- Existing Q4 incident rows were temporarily represented by the renamed
-- RESOLVED enum value. Restore active ones to CRITICAL_UNRESOLVED while keeping
-- genuinely resolved historical incidents RESOLVED.
update public.incidents
set state = case
  when state = 'RESOLVED' and resolved_at is null then 'CRITICAL_UNRESOLVED'::public.safety_state
  when state = 'NORMAL' and resolved_at is not null then 'RESOLVED'::public.safety_state
  else state
end;

create or replace function public._transition_automaton(
  _user uuid,
  _alarm_to public.safety_state,
  _automaton_to public.deadhand_automaton_state,
  _rule text,
  _incident uuid,
  _device uuid,
  _heartbeat uuid,
  _actor text,
  _details jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  _from_alarm public.safety_state;
  _from_automaton public.deadhand_automaton_state;
  _covert boolean := _rule like 'DURESS%' or _actor like 'operator:duress%';
begin
  select state, automaton_state into _from_alarm, _from_automaton
  from safety_status where user_id = _user for update;
  if _from_alarm is null then raise exception 'NO_STATUS'; end if;
  if not ((_from_automaton::text || '>' || _automaton_to::text) = any (array[
    'Q0>Q1', 'Q0>Q3',
    'Q1>Q0', 'Q1>Q2', 'Q1>Q3',
    'Q2>Q0', 'Q2>Q3',
    'Q3>Q4',
    'Q4>Q1'
  ])) then
    raise exception 'ILLEGAL_TRANSITION % -> %', _from_automaton, _automaton_to;
  end if;

  update safety_status
  set state = _alarm_to,
      automaton_state = _automaton_to,
      state_entered_at = now(),
      updated_at = now(),
      active_incident_id = case when _automaton_to = 'Q0' then null else coalesce(active_incident_id, _incident) end
  where user_id = _user;

  if _incident is not null then
    if _automaton_to = 'Q0' then
      update incidents
      set state = 'RESOLVED', resolved_at = coalesce(resolved_at, now()), resolution = coalesce(resolution, _rule)
      where id = _incident;
    else
      update incidents set state = _alarm_to where id = _incident;
    end if;
  end if;

  insert into incident_events(user_id, incident_id, prev_state, new_state, rule, device_id, heartbeat_id, actor, details, covert)
  values (
    _user, _incident, _from_alarm, _alarm_to, _rule, _device, _heartbeat, _actor,
    coalesce(_details, '{}'::jsonb) || jsonb_build_object('automaton_from', _from_automaton, 'automaton_to', _automaton_to), _covert
  );
end $$;

-- Preserve the existing helper signature for any server-side callers while
-- routing its state change through the explicit automaton transition helper.
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
  st safety_status;
  _automaton_to public.deadhand_automaton_state;
  _alarm_to public.safety_state := _to;
begin
  select * into st from safety_status where user_id = _user for update;
  _automaton_to := case _to::text
    when 'NORMAL' then 'Q0'
    when 'ARE_YOU_ALIVE' then 'Q1'
    when 'PROLONGED_NO_RESPONSE' then 'Q2'
    when 'CRITICAL_UNRESOLVED' then case when st.automaton_state = 'Q3' then 'Q4' else 'Q3' end
    else 'Q0'
  end::public.deadhand_automaton_state;
  if _to = 'RESOLVED' then _alarm_to := 'NORMAL'; end if;
  perform public._transition_automaton(_user, _alarm_to, _automaton_to, _rule, _incident, _device, _heartbeat, _actor, _details);
end $$;

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
  set last_seq = _seq, last_seen_at = now(), last_complete_at = case when _complete then now() else last_complete_at end
  where id = _device;
  update safety_status
  set last_any_heartbeat_at = now(),
      last_complete_heartbeat_at = case when _complete then now() else last_complete_heartbeat_at end,
      updated_at = now()
  where user_id = _user returning * into st;

  if public._heartbeat_ok(_user) and st.automaton_state = 'Q1' then
    perform public._transition_automaton(_user, 'NORMAL', 'Q0', 'COMPLETE_HEARTBEAT_RECEIVED', st.active_incident_id, _device, _hb, 'device:' || _device);
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
    values (_user, 'DURESS', true, 'CRITICAL_UNRESOLVED', now()) returning id into _inc;
    update safety_status set active_incident_id = _inc where user_id = _user;
  end if;

  if st.automaton_state in ('Q0', 'Q1', 'Q2') then
    perform public._transition_automaton(_user, 'CRITICAL_UNRESOLVED', 'Q3', 'DURESS_CODE_ENTERED', _inc, _device, _hb, 'operator:duress');
  elsif st.automaton_state = 'Q3' then
    perform public._transition_automaton(_user, 'CRITICAL_UNRESOLVED', 'Q4', 'DURESS_CODE_ENTERED', _inc, _device, _hb, 'operator:duress');
  else
    update incidents set state = 'CRITICAL_UNRESOLVED' where id = _inc;
    update safety_status set state = 'CRITICAL_UNRESOLVED', automaton_state = 'Q4', state_entered_at = now(), updated_at = now() where user_id = _user;
    insert into incident_events(user_id, incident_id, rule, actor, details, covert)
    values (_user, _inc, 'DURESS_CODE_ENTERED', 'operator:duress', jsonb_build_object('automaton_state', 'Q4'), true);
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
    if st.automaton_state in ('Q1', 'Q2') then
      perform public._transition_automaton(_user, 'NORMAL', 'Q0', 'CORRECT_RESPONSE', st.active_incident_id, _device, _hb, 'operator');
    elsif st.automaton_state = 'Q3' then
      perform public._transition_automaton(_user, 'CRITICAL_UNRESOLVED', 'Q4', 'CORRECT_RESPONSE', st.active_incident_id, _device, _hb, 'operator');
    elsif st.automaton_state = 'Q4' then
      perform public._transition_automaton(_user, 'ARE_YOU_ALIVE', 'Q1', 'CORRECT_RESPONSE', st.active_incident_id, _device, _hb, 'operator');
    end if;
  elsif _response = 'UNSAFE' and st.automaton_state = 'Q4' then
    update safety_status set state = 'CRITICAL_UNRESOLVED', automaton_state = 'Q4', state_entered_at = now(), updated_at = now() where user_id = _user;
    insert into incident_events(user_id, incident_id, rule, actor, details)
    values (_user, st.active_incident_id, 'UNSAFE_REPORT', 'operator', jsonb_build_object('automaton_state', 'Q4'));
  end if;
end $$;

create or replace function public._visible_checkin(_user uuid, _device uuid, _hb uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._respond(_user, 'CORRECT', _device, _hb);
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
  if not _armed and st.automaton_state <> 'Q0' then
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
  update incidents set state = 'RESOLVED', resolved_at = now(), resolution = 'OPERATOR_STAND_DOWN'
  where user_id = _user and covert and resolved_at is null;
  update safety_status set state = 'NORMAL', automaton_state = 'Q0', state_entered_at = now(), active_incident_id = null, updated_at = now() where user_id = _user;
  insert into incident_events(user_id, rule, actor, details, covert) values (_user, 'DURESS_STAND_DOWN', 'operator', jsonb_build_object('automaton_state', 'Q0'), true);
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
    if r.automaton_state = 'Q0' and coalesce(r.last_any_heartbeat_at, r.armed_at, r.state_entered_at) < now() - interval '24 hours' then
      insert into incidents(user_id, trigger, state) values (r.user_id, 'WATCHDOG', 'ARE_YOU_ALIVE') returning id into _inc;
      update safety_status set active_incident_id = _inc where user_id = r.user_id;
      perform public._transition_automaton(r.user_id, 'ARE_YOU_ALIVE', 'Q1', 'NO_SIGNAL_24H', _inc, null, null, 'system:watchdog', jsonb_build_object('correlation', public._correlation(r.user_id)));
      _n := _n + 1;
    elsif r.automaton_state = 'Q1' and public._heartbeat_ok(r.user_id) then
      perform public._transition_automaton(r.user_id, 'NORMAL', 'Q0', 'HEARTBEAT_RESTORED', r.active_incident_id, null, null, 'system:watchdog', '{}');
      _n := _n + 1;
    elsif r.automaton_state = 'Q1' and r.state_entered_at < now() - interval '72 hours' then
      perform public._transition_automaton(r.user_id, 'PROLONGED_NO_RESPONSE', 'Q2', 'NO_SAFE_RESPONSE_72H', r.active_incident_id, null, null, 'system:watchdog', '{}');
      _n := _n + 1;
    elsif r.automaton_state = 'Q2' and r.state_entered_at < now() - interval '48 hours' then
      perform public._transition_automaton(r.user_id, 'CRITICAL_UNRESOLVED', 'Q3', 'NO_LOCATION_RESPONSE_48H', r.active_incident_id, null, null, 'system:watchdog', '{}');
      update incidents set escalated_at = now() where id = r.active_incident_id;
      perform public._execute_cascade(r.active_incident_id);
      _n := _n + 1;
    elsif r.automaton_state = 'Q3' and r.state_entered_at < now() - interval '120 hours' then
      update safety_status set state = 'CRITICAL_UNRESOLVED', automaton_state = 'Q3', state_entered_at = now(), updated_at = now() where user_id = r.user_id;
      insert into incident_events(user_id, incident_id, rule, actor, details)
      values (r.user_id, r.active_incident_id, 'RESEND_ATTENTION_ALERT', 'system:watchdog', jsonb_build_object('automaton_state', 'Q3'));
      perform public._execute_cascade(r.active_incident_id);
      _n := _n + 1;
    elsif r.automaton_state = 'Q4' and r.state_entered_at < now() - interval '120 hours' then
      update safety_status set state = 'CRITICAL_UNRESOLVED', automaton_state = 'Q4', state_entered_at = now(), updated_at = now() where user_id = r.user_id;
      insert into incident_events(user_id, incident_id, rule, actor, details)
      values (r.user_id, r.active_incident_id, 'LIVELINESS_ALERT_CYCLE', 'system:watchdog', jsonb_build_object('automaton_state', 'Q4'));
      perform public._execute_cascade(r.active_incident_id);
      _n := _n + 1;
    end if;
  end loop;

  perform public._execute_cascade(i.id) from incidents i where i.covert and i.resolved_at is null;
  return _n;
end $$;

revoke execute on function public._transition_automaton(uuid, public.safety_state, public.deadhand_automaton_state, text, uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public._transition_automaton(uuid, public.safety_state, public.deadhand_automaton_state, text, uuid, uuid, uuid, text, jsonb) to service_role;
grant execute on function public.api_unsafe_report(uuid, uuid) to service_role;

commit;
