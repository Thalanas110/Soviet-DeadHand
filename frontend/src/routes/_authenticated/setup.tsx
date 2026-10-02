import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SetupStage } from "@/components/deadhand/SetupStage";
import { Panel, Shell } from "@/components/deadhand/Shell";
import { useOperator } from "@/hooks/use-operator";
import { contactsApi } from "@/lib/api";
import { tokenForDeviceKind, type SetupDeviceToken } from "@/lib/setup-device-token";
import {
  authorizeSetupContact,
  registerSetupDevice,
  saveSetupPasswords,
} from "@/lib/setup-actions";
import {
  deriveSetupReadiness,
  firstIncompleteStage,
  initialSetupStage,
  type SetupStageId,
} from "@/lib/setup-readiness";
import { readSetPinsForm, setPinsValidationMessage } from "@/lib/schemas";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({
    meta: [
      { title: "Setup · Dead Hand" },
      { name: "description", content: "Configure the Dead Hand personal safety system." },
    ],
  }),
  component: Setup,
});

const STAGES: Array<{
  id: SetupStageId;
  title: string;
  ru: string;
  required: boolean;
  description: string;
}> = [
  {
    id: "passwords",
    title: "Access passwords",
    ru: "Коды доступа",
    required: true,
    description: "Create distinct passwords for ordinary check-ins and covert duress.",
  },
  {
    id: "handset",
    title: "Handset",
    ru: "Телефон",
    required: true,
    description: "Register the phone that will report the primary safety heartbeat.",
  },
  {
    id: "cascade",
    title: "Emergency cascade",
    ru: "Цепь оповещения",
    required: true,
    description: "Authorize at least one person to receive an emergency dispatch.",
  },
  {
    id: "wearable",
    title: "Wearable",
    ru: "Наручный узел",
    required: false,
    description: "Add a wearable as a second heartbeat source when bridge support is available.",
  },
];

function Setup() {
  const { data, isPending: operatorPending, error: operatorError } = useOperator();
  const contactsQuery = useQuery({
    queryKey: ["contacts"],
    queryFn: contactsApi.list,
  });
  const qc = useQueryClient();
  const [activeStage, setActiveStage] = useState<SetupStageId>("passwords");
  const [device, setDevice] = useState({ label: "", kind: "phone" as "phone" | "wearable" });
  const [contact, setContact] = useState({
    alias: "",
    name: "",
    email: "",
    phone: "",
    priority: 1,
  });
  const [deviceToken, setDeviceToken] = useState<SetupDeviceToken | null>(null);
  const [busy, setBusy] = useState(false);
  const stageInitialized = useRef(false);

  const readiness = useMemo(
    () => deriveSetupReadiness(data, contactsQuery.data),
    [data, contactsQuery.data],
  );
  const firstStage = initialSetupStage(readiness);
  const hasRemainingSetup = firstIncompleteStage(readiness) !== null;

  useEffect(() => {
    if (operatorPending || contactsQuery.isPending || stageInitialized.current) return;
    stageInitialized.current = true;
    setActiveStage(firstStage);
  }, [contactsQuery.isPending, firstStage, operatorPending]);

  async function savePasswords(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = readSetPinsForm(event.currentTarget);
    const validationMessage = setPinsValidationMessage(values);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setBusy(true);
    try {
      await saveSetupPasswords(values);
      toast.success("Passwords saved");
      event.currentTarget.reset();
      await qc.invalidateQueries({ queryKey: ["operator"] });
      setActiveStage("handset");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Passwords rejected");
    } finally {
      setBusy(false);
    }
  }

  async function registerDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload =
        activeStage === "wearable" ? { ...device, kind: "wearable" as const } : device;
      const registered = await registerSetupDevice(payload);
      setDeviceToken(registered);
      setDevice({ label: "", kind: payload.kind });
      toast.success("Device registered");
      await qc.invalidateQueries({ queryKey: ["operator"] });
      if (registered.kind === "phone") setActiveStage("cascade");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function authorizeContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await authorizeSetupContact(contact);
      setContact({
        alias: "",
        name: "",
        email: "",
        phone: "",
        priority: contact.priority + 1 > 9 ? 9 : contact.priority + 1,
      });
      toast.success("Contact authorized");
      await qc.invalidateQueries({ queryKey: ["contacts"] });
      setActiveStage("wearable");
    } catch {
      toast.error("Check the contact fields");
    } finally {
      setBusy(false);
    }
  }

  const loading = operatorPending || contactsQuery.isPending;
  const error = operatorError ?? contactsQuery.error;

  return (
    <Shell callsign={data?.profile?.callsign} railActive={hasRemainingSetup}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Комплекс «Периметр» · Web setup
          </p>
          <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-primary glow-amber md:text-5xl">
            Establish the system
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Configure the account once. The Dashboard remains the single live monitoring surface.
          </p>
        </div>
        <Link
          to="/console"
          className="border border-primary px-4 py-2 text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Open Dashboard
        </Link>
      </div>

      {loading ? (
        <Panel title="Setup status" code="LOADING">
          <p className="text-xs text-muted-foreground">Loading operator configuration.</p>
        </Panel>
      ) : error ? (
        <Panel title="Setup status" code="UNAVAILABLE">
          <p className="text-xs text-destructive">Could not load operator configuration.</p>
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[0.82fr_1.4fr]">
          <div className="space-y-3">
            <Panel title="Readiness sequence" code="Q0–Q4">
              <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                Setup progression only · not live alarm state
              </p>
              <ol className="setup-progress mb-4">
                {[
                  ["Q0", "PROFILE", Boolean(data?.profile)],
                  ["Q1", "ACCESS", readiness.passwords],
                  ["Q2", "HANDSET", readiness.handset],
                  ["Q3", "CASCADE", readiness.cascade],
                  ["Q4", "WEARABLE", readiness.wearable],
                ].map(([code, label, ready]) => (
                  <li key={code} className={ready ? "is-ready" : ""}>
                    <span>{code}</span>
                    <span>{label}</span>
                    <span>{ready ? "READY" : "OPEN"}</span>
                  </li>
                ))}
              </ol>
              <div className="setup-map">
                {STAGES.map((stage, index) => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setActiveStage(stage.id)}
                    className={`setup-map__item ${activeStage === stage.id ? "is-active" : ""}`}
                  >
                    <span className="setup-map__index">0{index + 1}</span>
                    <span className="min-w-0 text-left">
                      <span className="block text-[10px] uppercase tracking-[0.2em] text-primary">
                        {stage.ru}
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-widest text-muted-foreground">
                        {stage.title}
                      </span>
                    </span>
                    <span className={readiness[stage.id] ? "text-radar" : "text-muted-foreground"}>
                      {readiness[stage.id] ? "READY" : stage.required ? "REQUIRED" : "OPTIONAL"}
                    </span>
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Operator identity" code={data?.profile?.callsign ?? "UNSET"}>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Callsign is assigned by the system. Configuration actions below are scoped to this
                authenticated operator.
              </p>
            </Panel>
          </div>

          <div className="space-y-3">
            {STAGES.map((stage) => (
              <SetupStage
                key={stage.id}
                id={stage.id}
                title={stage.title}
                required={stage.required}
                complete={readiness[stage.id]}
                active={activeStage === stage.id}
                onSelect={() => setActiveStage(stage.id)}
              >
                <p className="mb-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                  {stage.description}
                </p>
                {stage.id === "passwords" && (
                  <PasswordForm
                    busy={busy}
                    onSubmit={savePasswords}
                    configured={readiness.passwords}
                  />
                )}
                {stage.id === "handset" && (
                  <DeviceForm
                    busy={busy}
                    device={device}
                    onChange={setDevice}
                    onSubmit={registerDevice}
                    token={tokenForDeviceKind(deviceToken, "phone")}
                  />
                )}
                {stage.id === "cascade" && (
                  <ContactForm
                    busy={busy}
                    contact={contact}
                    onChange={setContact}
                    onSubmit={authorizeContact}
                  />
                )}
                {stage.id === "wearable" && (
                  <DeviceForm
                    busy={busy}
                    device={{ ...device, kind: "wearable" }}
                    onChange={(next) => setDevice({ ...next, kind: "wearable" })}
                    onSubmit={registerDevice}
                    token={tokenForDeviceKind(deviceToken, "wearable")}
                  />
                )}
              </SetupStage>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

export function PasswordForm({
  busy,
  configured,
  onSubmit,
}: {
  busy: boolean;
  configured: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const input = "mt-1 w-full border border-input bg-panel px-3 py-2 text-sm";

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-3">
      {configured && (
        <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">
          Current password
          <input
            name="current"
            required
            type="password"
            minLength={8}
            maxLength={64}
            autoComplete="current-password"
            className={input}
          />
        </label>
      )}
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">
        Check-in password
        <input
          name="checkin"
          required
          type="password"
          minLength={8}
          maxLength={64}
          autoComplete="new-password"
          className={input}
        />
      </label>
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">
        Duress password
        <input
          name="duress"
          required
          type="password"
          minLength={8}
          maxLength={64}
          autoComplete="new-password"
          className={input}
        />
      </label>
      <button
        disabled={busy}
        className="bg-primary px-4 py-2.5 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
      >
        Save passwords
      </button>
    </form>
  );
}

function DeviceForm({
  busy,
  device,
  onChange,
  onSubmit,
  token,
}: {
  busy: boolean;
  device: { label: string; kind: "phone" | "wearable" };
  onChange: (device: { label: string; kind: "phone" | "wearable" }) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  token: string | null;
}) {
  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-3">
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">
        Device label
        <input
          required
          value={device.label}
          onChange={(event) => onChange({ ...device, label: event.target.value })}
          className="mt-1 w-full border border-input bg-panel px-3 py-2 text-sm"
          placeholder="Phone or wearable name"
        />
      </label>
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">
        Device type
        <select
          value={device.kind}
          onChange={(event) =>
            onChange({ ...device, kind: event.target.value as "phone" | "wearable" })
          }
          className="mt-1 w-full border border-input bg-panel px-3 py-2 text-sm"
        >
          <option value="phone">Phone</option>
          <option value="wearable">Wearable</option>
        </select>
      </label>
      <button
        disabled={busy}
        className="bg-primary px-4 py-2.5 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
      >
        Register device
      </button>
      {token && (
        <div className="crt p-3 text-[11px]">
          <p className="relative text-primary">Device token, shown once.</p>
          <code className="relative mt-1 block break-all text-radar">{token}</code>
        </div>
      )}
    </form>
  );
}

type ContactFormState = {
  alias: string;
  name: string;
  email: string;
  phone: string;
  priority: number;
};

function ContactForm({
  busy,
  contact,
  onChange,
  onSubmit,
}: {
  busy: boolean;
  contact: ContactFormState;
  onChange: (contact: ContactFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const input = "mt-1 w-full border border-input bg-panel px-3 py-2 text-sm";

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-3">
      {(
        [
          ["alias", "Alias", "text"],
          ["name", "Full name", "text"],
          ["email", "Email", "email"],
          ["phone", "Phone (optional)", "tel"],
        ] as const
      ).map(([key, label, type]) => (
        <label
          key={key}
          className="block text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          {label}
          <input
            required={key !== "phone"}
            type={type}
            value={contact[key]}
            onChange={(event) => onChange({ ...contact, [key]: event.target.value })}
            className={input}
          />
        </label>
      ))}
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">
        Priority (1 = first)
        <input
          required
          type="number"
          min={1}
          max={9}
          value={contact.priority}
          onChange={(event) => onChange({ ...contact, priority: Number(event.target.value) })}
          className={input}
        />
      </label>
      <button
        disabled={busy}
        className="bg-primary px-4 py-2.5 text-xs uppercase tracking-widest text-primary-foreground disabled:opacity-50"
      >
        Authorize contact
      </button>
    </form>
  );
}
