import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell, Panel, fmtAgo } from "@/components/deadhand/Shell";
import { useOperator, useNow } from "@/hooks/use-operator";
import { registerDevice, revokeDevice } from "@/lib/deadhand.functions";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({ meta: [{ title: "Узлы · Dead Hand Devices" }, { name: "description", content: "Registered handsets and wearables." }] }),
  component: Devices,
});

function Devices() {
  const { data } = useOperator();
  const now = useNow(5000);
  const qc = useQueryClient();
  const reg = useServerFn(registerDevice);
  const rev = useServerFn(revokeDevice);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<"phone" | "wearable">("wearable");
  const [token, setToken] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await reg({ data: { label, kind } });
      setToken(r.token);
      setLabel("");
      qc.invalidateQueries({ queryKey: ["operator"] });
    } catch {
      toast.error("Registration failed");
    }
  }

  return (
    <Shell callsign={data?.profile?.callsign}>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Зарегистрировать узел · Register device">
          <form onSubmit={add} className="space-y-2">
            <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Huawei Watch GT)" className="w-full border border-input bg-panel px-3 py-2 text-sm" />
            <select value={kind} onChange={(e) => setKind(e.target.value as "phone" | "wearable")} className="w-full border border-input bg-panel px-3 py-2 text-sm">
              <option value="wearable">Wearable</option>
              <option value="phone">Phone</option>
            </select>
            <button className="w-full bg-primary py-2.5 font-display text-sm uppercase tracking-widest text-primary-foreground">Register</button>
          </form>
          {token && (
            <div className="crt mt-3 p-3 text-[11px]">
              <p className="relative text-primary">Device token, shown once. Use it as a Bearer token on POST /api/public/telemetry:</p>
              <code className="relative mt-1 block break-all text-radar">{token}</code>
            </div>
          )}
        </Panel>
        <Panel title="Узлы · Devices">
          <ul className="space-y-2 text-xs">
            {data?.devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <p className={d.revoked_at ? "line-through text-muted-foreground" : "text-primary"}>{d.label} · {d.kind}</p>
                  <p className="text-[10px] text-muted-foreground">seen {fmtAgo(d.last_seen_at, now)} · complete {fmtAgo(d.last_complete_at, now)} · seq {d.last_seq}</p>
                </div>
                {!d.revoked_at && (
                  <button onClick={async () => { await rev({ data: { id: d.id } }); qc.invalidateQueries({ queryKey: ["operator"] }); }} className="text-[10px] uppercase text-destructive">Revoke</button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Shell>
  );
}
