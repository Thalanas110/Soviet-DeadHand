import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell, Panel } from "@/components/deadhand/Shell";
import { useOperator } from "@/hooks/use-operator";
import { operatorApi } from "@/lib/api";
import { setPinsValidationMessage } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Access passwords · Dead Hand" },
      { name: "description", content: "Check-in and duress passwords." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { data } = useOperator();
  const qc = useQueryClient();
  const [f, setF] = useState({ current: "", checkin: "", duress: "" });
  const [sd, setSd] = useState("");
  const inp = "w-full border border-input bg-panel px-3 py-2 text-sm tracking-[0.15em]";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validationMessage = setPinsValidationMessage(f);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      const r = await operatorApi.action({ action: "setPins", ...f });
      if (r.ok) {
        toast.success("Passwords sealed");
        setF({ current: "", checkin: "", duress: "" });
        qc.invalidateQueries({ queryKey: ["operator"] });
      } else toast.error(r.error === "PIN_REJECTED" ? "Current password rejected" : "Rejected");
    } catch {
      toast.error("Passwords must be 8–64 characters and differ");
    }
  }

  return (
    <Shell callsign={data?.profile?.callsign}>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Access passwords" code={data?.profile?.pins_configured ? "SET" : "UNSET"}>
          <form onSubmit={submit} className="space-y-2">
            {data?.profile?.pins_configured && (
              <input
                type="password"
                required
                minLength={8}
                maxLength={64}
                autoComplete="current-password"
                placeholder="Current password"
                value={f.current}
                onChange={(e) => setF({ ...f, current: e.target.value })}
                className={inp}
              />
            )}
            <input
              required
              type="password"
              minLength={8}
              maxLength={64}
              autoComplete="new-password"
              placeholder="Check-in password"
              value={f.checkin}
              onChange={(e) => setF({ ...f, checkin: e.target.value })}
              className={inp}
            />
            <input
              required
              type="password"
              minLength={8}
              maxLength={64}
              autoComplete="new-password"
              placeholder="Duress password"
              value={f.duress}
              onChange={(e) => setF({ ...f, duress: e.target.value })}
              className={inp}
            />
            <button className="w-full bg-primary py-2.5 font-display text-sm uppercase tracking-widest text-primary-foreground">
              Seal passwords
            </button>
          </form>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Entering the duress password anywhere a password is requested shows the normal
            confirmation, but silently opens an emergency incident and alerts your contacts.
          </p>
        </Panel>
        <Panel title="Stand down">
          <p className="text-[11px] text-muted-foreground">
            Ends any active silent alarm. Requires your check-in password.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              type="password"
              required
              minLength={8}
              maxLength={64}
              autoComplete="current-password"
              placeholder="Check-in password"
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
