import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell, Panel } from "@/components/deadhand/Shell";
import { useOperator } from "@/hooks/use-operator";
import { operatorApi } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Коды · Dead Hand Codes" },
      { name: "description", content: "Check-in and duress codes." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { data } = useOperator();
  const qc = useQueryClient();
  const [f, setF] = useState({ current: "", checkin: "", duress: "" });
  const [sd, setSd] = useState("");
  const inp = "w-full border border-input bg-panel px-3 py-2 text-sm tracking-[0.4em]";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await operatorApi.action({ action: "setPins", ...f });
      if (r.ok) {
        toast.success("Codes sealed");
        setF({ current: "", checkin: "", duress: "" });
        qc.invalidateQueries({ queryKey: ["operator"] });
      } else toast.error(r.error === "PIN_REJECTED" ? "Current PIN rejected" : "Rejected");
    } catch {
      toast.error("PINs must be 4–8 digits and differ");
    }
  }

  return (
    <Shell callsign={data?.profile?.callsign}>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Коды доступа · Access codes"
          code={data?.profile?.pins_configured ? "SET" : "UNSET"}
        >
          <form onSubmit={submit} className="space-y-2">
            {data?.profile?.pins_configured && (
              <input
                inputMode="numeric"
                type="password"
                placeholder="Current check-in PIN"
                value={f.current}
                onChange={(e) => setF({ ...f, current: e.target.value })}
                className={inp}
              />
            )}
            <input
              required
              inputMode="numeric"
              type="password"
              placeholder="Check-in PIN"
              value={f.checkin}
              onChange={(e) => setF({ ...f, checkin: e.target.value })}
              className={inp}
            />
            <input
              required
              inputMode="numeric"
              type="password"
              placeholder="Duress PIN"
              value={f.duress}
              onChange={(e) => setF({ ...f, duress: e.target.value })}
              className={inp}
            />
            <button className="w-full bg-primary py-2.5 font-display text-sm uppercase tracking-widest text-primary-foreground">
              Seal codes
            </button>
          </form>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Entering the duress PIN anywhere a PIN is asked shows the normal confirmation, but
            silently opens an emergency incident and alerts your contacts right away.
          </p>
        </Panel>
        <Panel title="Отбой · Stand down">
          <p className="text-[11px] text-muted-foreground">
            Ends any active silent alarm. Requires your check-in PIN.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              inputMode="numeric"
              type="password"
              value={sd}
              onChange={(e) => setSd(e.target.value)}
              className={inp}
            />
            <button
              onClick={async () => {
                try {
                  const r = await operatorApi.action({ action: "standDown", pin: sd });
                  setSd("");
                  if (r.ok) toast.success("ПРИНЯТО");
                  else toast.error("Rejected");
                } catch {
                  toast.error("Rejected");
                }
              }}
              className="border border-primary px-4 text-xs uppercase text-primary"
            >
              OK
            </button>
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
