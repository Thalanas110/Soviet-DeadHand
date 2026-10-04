begin;

create or replace function public.api_set_armed(_user uuid, _armed boolean, _pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  _cls text;
  st safety_status;
begin
  _cls := public._classify_pin(_user, _pin);
  if _cls in ('UNCONFIGURED','REJECTED') then
    return jsonb_build_object(
      'ok', false,
      'error', case when _cls = 'UNCONFIGURED' then 'PINS_NOT_CONFIGURED' else 'PIN_REJECTED' end
    );
  end if;

  if _cls = 'DURESS' then
    perform public._open_duress(_user, null, null);
    return jsonb_build_object('ok', true, 'acknowledged_at', now());
  end if;

  select * into st from safety_status where user_id = _user for update;
  if not _armed and st.automaton_state <> 'Q0' then
    return jsonb_build_object('ok', false, 'error', 'CHECK_IN_BEFORE_DISARM');
  end if;

  update safety_status
  set armed = _armed,
      armed_at = case when _armed then now() else armed_at end,
      updated_at = now()
  where user_id = _user;

  insert into incident_events(user_id, rule, actor, details)
  values (_user, case when _armed then 'ARMED' else 'DISARMED' end, 'operator', '{}'::jsonb);

  return jsonb_build_object('ok', true, 'acknowledged_at', now());
end $$;

commit;
