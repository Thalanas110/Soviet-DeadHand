begin;

alter table public.heartbeats
  add column if not exists heart_rate_bpm integer,
  add column if not exists heart_rate_ts timestamptz,
  add column if not exists wearable_sync_ts timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'heartbeats_heart_rate_bpm_range'
      and conrelid = 'public.heartbeats'::regclass
  ) then
    alter table public.heartbeats
      add constraint heartbeats_heart_rate_bpm_range
      check (heart_rate_bpm is null or heart_rate_bpm between 1 and 300);
  end if;
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
  _loc_ts timestamptz,
  _heart_rate_bpm int,
  _heart_rate_ts timestamptz,
  _wearable_sync_ts timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d devices;
  _hb uuid;
  _complete boolean;
  st safety_status;
begin
  if _heart_rate_bpm is not null and (_heart_rate_bpm < 1 or _heart_rate_bpm > 300) then
    raise exception 'INVALID_HEART_RATE';
  end if;

  select * into d from devices where id = _device and user_id = _user for update;
  if not found or d.revoked_at is not null then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  if _seq <= d.last_seq then raise exception 'REPLAY_REJECTED'; end if;

  _complete := _loc_enc is not null and _loc_iv is not null and _loc_acc is not null and _loc_acc > 0 and _loc_acc <= 5000
    and _loc_ts is not null and _loc_ts between now() - interval '10 minutes' and now() + interval '2 minutes';

  insert into heartbeats(
    user_id, device_id, seq, client_ts, complete, battery, charging, network, wearable_connected,
    location_enc, location_iv, location_accuracy, location_ts, heart_rate_bpm, heart_rate_ts, wearable_sync_ts
  )
  values (
    _user, _device, _seq, _client_ts, _complete, _battery, _charging, _network, _wearable,
    case when _complete then _loc_enc end,
    case when _complete then _loc_iv end,
    case when _complete then _loc_acc end,
    case when _complete then _loc_ts end,
    _heart_rate_bpm, _heart_rate_ts, _wearable_sync_ts
  )
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

  if public._heartbeat_ok(_user) and st.automaton_state = 'Q1' then
    perform public._transition_automaton(
      _user, 'NORMAL', 'Q0', 'COMPLETE_HEARTBEAT_RECEIVED', st.active_incident_id,
      _device, _hb, 'device:' || _device
    );
  end if;

  return jsonb_build_object('heartbeat_id', _hb, 'complete', _complete);
end $$;

create or replace function public.api_ingest_device(
  _token_hash text,
  _seq bigint,
  _client_ts timestamptz,
  _battery int,
  _charging boolean,
  _network text,
  _wearable boolean,
  _loc_enc text,
  _loc_iv text,
  _loc_acc double precision,
  _loc_ts timestamptz,
  _heart_rate_bpm int,
  _heart_rate_ts timestamptz,
  _wearable_sync_ts timestamptz
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d devices;
begin
  select * into d from devices where token_hash = _token_hash and revoked_at is null for update;
  if d.id is null then raise exception 'DEVICE_NOT_AUTHORIZED'; end if;
  return public._ingest(
    d.user_id, d.id, _seq, _client_ts, _battery, _charging, _network, _wearable,
    _loc_enc, _loc_iv, _loc_acc, _loc_ts, _heart_rate_bpm, _heart_rate_ts, _wearable_sync_ts
  );
end $$;

create or replace function public.api_checkin(
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
  _loc_ts timestamptz,
  _pin text,
  _heart_rate_bpm int,
  _heart_rate_ts timestamptz,
  _wearable_sync_ts timestamptz
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
    _r := public._ingest(
      _user, _device, _seq, _client_ts, _battery, _charging, _network, _wearable,
      _loc_enc, _loc_iv, _loc_acc, _loc_ts, _heart_rate_bpm, _heart_rate_ts, _wearable_sync_ts
    );
    _hb := (_r->>'heartbeat_id')::uuid;
  exception when others then
    if _cls <> 'DURESS' then return jsonb_build_object('ok', false, 'error', sqlerrm); end if;
  end;

  if _cls = 'DURESS' then
    perform public._open_duress(_user, _device, _hb);
  else
    perform public._respond(_user, 'CORRECT', _device, _hb);
  end if;

  return jsonb_build_object('ok', true, 'acknowledged_at', now());
end $$;

create or replace function public._snapshot(_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'captured_at', now(),
    'last_complete', (
      select to_jsonb(x)
      from (
        select h.id, h.device_id, h.received_at, h.battery, h.charging, h.network,
          h.location_enc, h.location_iv, h.location_accuracy, h.location_ts,
          h.heart_rate_bpm, h.heart_rate_ts, h.wearable_sync_ts
        from heartbeats h
        where h.user_id = _user and h.complete
        order by h.received_at desc
        limit 1
      ) x
    ),
    'last_any', (
      select to_jsonb(x)
      from (
        select h.id, h.device_id, h.received_at, h.battery, h.network,
          h.wearable_connected, h.heart_rate_bpm, h.heart_rate_ts, h.wearable_sync_ts
        from heartbeats h
        where h.user_id = _user
        order by h.received_at desc
        limit 1
      ) x
    ),
    'devices', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'id', d.id,
          'label', d.label,
          'kind', d.kind,
          'last_seen_at', d.last_seen_at,
          'last_complete_at', d.last_complete_at
        )),
        '[]'::jsonb
      )
      from devices d
      where d.user_id = _user and d.revoked_at is null
    ),
    'correlation', public._correlation(_user)
  )
$$;

grant execute on function public.api_ingest_device(text, bigint, timestamptz, int, boolean, text, boolean, text, text, double precision, timestamptz, int, timestamptz, timestamptz) to service_role;
grant execute on function public.api_checkin(uuid, uuid, bigint, timestamptz, int, boolean, text, boolean, text, text, double precision, timestamptz, text, int, timestamptz, timestamptz) to service_role;

commit;
