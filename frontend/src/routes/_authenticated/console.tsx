import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell, Panel, Lamp, fmtAgo, fmtCountdown } from "@/components/deadhand/Shell";
import { PinPad } from "@/components/deadhand/PinPad";
import { useOperator, useNow } from "@/hooks/use-operator";
import { operatorApi } from "@/lib/api";
import { collectTelemetry, getHandsetId, setHandsetId } from "@/lib/telemetry";
import {
  ALERT_CYCLE_HOURS,
  LOCATION_WINDOW_HOURS,
  SAFE_WINDOW_HOURS,
  SILENCE_HOURS,
  STATE_LABEL,
} from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/console")({
  head: () => ({
    meta: [
      { title: "Пульт · Dead Hand Console" },
      { name: "description", content: "Dead Hand tactical console." },
    ],
  }),
  component: Console,
});

function Console() {
  const { data, isLoading } = useOperator();
  const now = useNow();
  const qc = useQueryClient();
  const [pad, setPad] = useState<null | "checkin" | "arm" | "disarm">(null);
  const [busy, setBusy] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);

  const st = data?.status;
  const label = STATE_LABEL[st?.state ?? "Q0"] ?? { code: "", ru: "", en: "" };
  const handsetId = getHandsetId();

  let deadline: number | null = null;
  let deadlineLabel = "";
  if (st?.armed) {
    if (st.state === "Q0") {
      const base = st.last_any_heartbeat_at ?? st.armed_at ?? st.state_entered_at;
      deadline = new Date(base).getTime() + SILENCE_HOURS * 3600_000;
      deadlineLabel = "Until safe challenge";
    } else if (st.state === "Q1") {
      deadline = new Date(st.state_entered_at).getTime() + SAFE_WINDOW_HOURS * 3600_000;
      deadlineLabel = "Until location challenge";
    } else if (st.state === "Q2") {
      deadline = new Date(st.state_entered_at).getTime() + LOCATION_WINDOW_HOURS * 3600_000;
      deadlineLabel = "Until attention mode";
    } else if (st.state === "Q3" || st.state === "Q4") {
      deadline = new Date(st.state_entered_at).getTime() + ALERT_CYCLE_HOURS * 3600_000;
      deadlineLabel = "Until next alert cycle";
    }
  }

  async function ensureHandset() {
    let id = getHandsetId();
    if (!id || !data?.devices.some((d) => d.id === id && !d.revoked_at)) {
      const r = await operatorApi.action({
        action: "registerDevice",
        label: "Handset",
        kind: "phone",
      });
      if (!r.id) throw new Error("Device registration failed");
      setHandsetId(r.id);
      id = r.id;
    }
    return id;
  }

  async function onPin(pin: string) {
    setBusy(true);
    try {
      if (pad === "checkin") {
        const deviceId = await ensureHandset();
        const t = await collectTelemetry(true);
        const r = await operatorApi.action({ action: "checkIn", ...t, deviceId, pin });
        if (r.ok) toast.success("Check-in received");
        else
          toast.error(
            r.error === "LOCATION_REQUIRED"
              ? "Location required for a complete heartbeat"
              : r.error === "PINS_NOT_CONFIGURED"
                ? "Set your PINs under Codes first"
                : "Rejected",
          );
      } else {
        const r = await operatorApi.action({ action: "setArmed", armed: pad === "arm", pin });
        if (r.ok) toast.success(pad === "arm" ? "ВЗВЕДЕНО · Armed" : "Disarmed");
        else
          toast.error(
            r.error === "PINS_NOT_CONFIGURED"
              ? "Set your PINs under Codes first"
              : r.error === "CHECK_IN_BEFORE_DISARM"
                ? "Check in before disarming"
                : "Rejected",
          );
      }
      qc.invalidateQueries({ queryKey: ["operator"] });
      setPad(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Link failure");
    } finally {
      setBusy(false);
    }
  }

  async function fireAlarm() {
    setCoverOpen(false);
    await operatorApi.action({ action: "silentAlarm", deviceId: handsetId }).catch(() => null);
    toast.success("Check-in received");
  }

  async function reportUnsafe() {
    await operatorApi.action({ action: "unsafeReport", deviceId: handsetId }).catch(() => null);
    qc.invalidateQueries({ queryKey: ["operator"] });
    toast.success("Check-in received");
  }

  const phones = data?.devices.filter((d) => d.kind === "phone" && !d.revoked_at) ?? [];
  const wear = data?.devices.filter((d) => d.kind === "wearable" && !d.revoked_at) ?? [];
  const fresh = (iso?: string | null) => !!iso && now - new Date(iso).getTime() < 6 * 3600_000;
  const tone =
    st?.state === "Q3" || st?.state === "Q4"
      ? "text-destructive glow-alarm"
      : st?.state === "Q0"
        ? "text-radar glow-radar"
        : "text-primary glow-amber";

  return (
    <Shell callsign={data?.profile?.callsign}>
      {isLoading ? (
        <p className="text-xs uppercase tracking-widest text-muted-foreground animate-blink">
          Установка связи…
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <div className="crt p-5">
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {label.code} · {st?.armed ? "Взведено" : "Не взведено"}
                  </p>
                  <p className={`mt-1 font-display text-4xl md:text-5xl ${tone}`}>{label.ru}</p>
                  <p className="text-xs uppercase tracking-widest text-foreground/70">{label.en}</p>
                </div>
                <button
                  onClick={() => setPad(st?.armed ? "disarm" : "arm")}
                  className={`border px-3 py-2 text-[10px] uppercase tracking-widest ${st?.armed ? "border-radar text-radar" : "border-primary text-primary"}`}
                >
                  {st?.armed ? "■ Взведено" : "□ Взвести"}
                </button>
              </div>
              <div className="relative mt-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {deadline ? deadlineLabel : "Таймер · Timer"}
                </p>
                <p className="font-display text-3xl tabular-nums text-primary glow-amber">
                  {deadline ? fmtCountdown(deadline - now) : "--:--:--"}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Last complete heartbeat: {fmtAgo(st?.last_complete_heartbeat_at, now)} ago
                </p>
              </div>
            </div>

            <button
              onClick={() => setPad("checkin")}
              className="w-full bg-primary py-6 font-display text-2xl uppercase tracking-widest text-primary-foreground active:brightness-90"
            >
              Я ЖИВ · Check in
            </button>

            <div className="plate relative p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Тихая тревога · Silent alarm
              </p>
              {!coverOpen ? (
                <button
                  onClick={() => setCoverOpen(true)}
                  className="hazard mt-2 h-12 w-full text-xs font-bold uppercase tracking-widest text-primary-foreground"
                >
                  <span className="bg-panel px-2 py-1 text-primary">Поднять крышку</span>
                </button>
              ) : (
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                  <button
                    onClick={fireAlarm}
                    className="h-12 border-2 border-destructive bg-destructive/20 font-display uppercase tracking-widest text-destructive"
                  >
                    Пуск
                  </button>
                  <button
                    onClick={() => setCoverOpen(false)}
                    className="border border-border px-3 text-xs uppercase"
                  >
                    ✕
                  </button>
                </div>
              )}
              <button
                onClick={reportUnsafe}
                className="mt-2 w-full border border-primary/60 py-2 text-[10px] uppercase tracking-widest text-primary"
              >
                Report unsafe
              </button>
            </div>

            <Panel title="Каналы связи · Links">
              <div className="grid grid-cols-2 gap-2">
                <Lamp
                  on={phones.some((d) => fresh(d.last_seen_at))}
                  label={`Phone ×${phones.length}`}
                />
                <Lamp
                  on={wear.some((d) => fresh(d.last_seen_at))}
                  tone="amber"
                  label={`Wearable ×${wear.length}`}
                />
                <Lamp on label="AES-256-GCM" />
                <Lamp on={!!st?.armed} label="Watchdog" />
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel title="Журнал · Event ledger" code="IMMUTABLE">
              <ul className="max-h-80 space-y-1.5 overflow-auto text-[11px]">
                {data?.events.length ? (
                  data.events.map((e) => (
                    <li key={e.id} className="border-l-2 border-primary/50 pl-2">
                      <span className="text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </span>{" "}
                      · <span className="text-primary">{e.rule}</span>
                      {e.new_state && (
                        <span className="text-foreground/70">
                          {" "}
                          {e.prev_state ?? "∅"} → {e.new_state}
                        </span>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">No events yet.</li>
                )}
              </ul>
            </Panel>
            <Panel title="Каскад · Dispatches">
              <ul className="space-y-1 text-[11px]">
                {data?.dispatches.length ? (
                  data.dispatches.map((d) => (
                    <li key={d.id}>
                      P{d.priority} ·{" "}
                      <span className={d.status === "SENT" ? "text-radar" : "text-primary"}>
                        {d.status}
                      </span>{" "}
                      · {new Date(d.created_at).toLocaleString()}
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">No dispatches.</li>
                )}
              </ul>
            </Panel>
          </div>
        </div>
      )}
      {pad && (
        <PinPad
          title={pad === "checkin" ? "Подтверждение" : pad === "arm" ? "Взвести" : "Снять"}
          sub="Enter PIN"
          busy={busy}
          onSubmit={onPin}
          onCancel={() => setPad(null)}
        />
      )}
    </Shell>
  );
}
