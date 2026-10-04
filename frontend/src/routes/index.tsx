import { createFileRoute, Link } from "@tanstack/react-router";
import { ReadinessRail } from "@/components/deadhand/ReadinessRail";

const EMBLEM_SRC = "/c4ff83c5eadddc1a6627fbce57d559e0.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dead Hand - Personal Safety Watchdog" },
      {
        name: "description",
        content:
          "A defensive personal safety system for check-ins, trusted contacts, connected devices, and emergency escalation.",
      },
      { property: "og:title", content: "Dead Hand - Personal Safety Watchdog" },
      {
        property: "og:description",
        content:
          "A defensive personal safety system for check-ins, trusted contacts, connected devices, and emergency escalation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const AUTOMATON_STAGES = [
  ["Q0", "Monitoring", "Registered devices report heartbeat signals."],
  ["Q1", "Check-in", "A missed check-in opens the configured response window."],
  ["Q2", "Direct response", "A second silence requests a direct response."],
  ["Q3", "Contact cascade", "Trusted contacts are notified according to your configuration."],
  ["Q4", "Liveliness alert", "An unresolved safety event is marked for follow-up."],
] as const;

const SETUP_STAGES = [
  ["01", "Access credentials", "Passwords for check-ins and duress", "Required"],
  ["02", "Primary handset", "Connected phone for monitoring", "Required"],
  ["03", "Emergency contacts", "Trusted contact cascade", "Required"],
  ["04", "Wearable bridge", "Optional connected device", "Recommended"],
] as const;

function Landing() {
  return (
    <main className="landing-page relative mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <ReadinessRail />

      <header className="landing-header">
        <div className="landing-brand">
          <span className="landing-brand__mark" aria-hidden="true">
            01
          </span>
          <div>
            <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">Dead Hand</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              Personal Safety Watchdog
            </p>
          </div>
        </div>
        <Link
          to="/auth"
          className="border border-primary px-3 py-1.5 text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Sign in
        </Link>
      </header>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero__copy">
          <p className="landing-kicker">Personal safety / setup</p>
          <h1
            id="hero-title"
            className="mt-5 max-w-3xl font-display text-5xl uppercase leading-[0.92] text-primary md:text-8xl"
          >
            Personal safety, under your control.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-foreground/85">
            Dead Hand watches for missed check-ins, device silence, and configured distress
            signals - then follows the response path you choose.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="bg-primary px-6 py-3 font-display text-sm uppercase tracking-widest text-primary-foreground hover:brightness-110"
            >
              Begin setup
            </Link>
          </div>
          <dl className="landing-facts mt-10">
            <div>
              <dt>Setup</dt>
              <dd>/setup</dd>
            </div>
            <div>
              <dt>Dashboard</dt>
              <dd>/console</dd>
            </div>
            <div>
              <dt>Response path</dt>
              <dd>Q0-Q4</dd>
            </div>
          </dl>
        </div>

        <section className="landing-seal" aria-labelledby="emblem-title">
          <div className="landing-seal__header">
            <span id="emblem-title">Historical visual reference</span>
            <span>01 / 01</span>
          </div>
          <div className="landing-seal__art">
            <span
              className="landing-seal__crosshair landing-seal__crosshair--top"
              aria-hidden="true"
            />
            <img
              src={EMBLEM_SRC}
              alt="Historical red emblem used as a visual reference for the product identity"
            />
            <span
              className="landing-seal__crosshair landing-seal__crosshair--bottom"
              aria-hidden="true"
            />
          </div>
          <div className="landing-seal__footer">
            <strong>Safety-only system</strong>
            <span>Historical visual reference. No political affiliation.</span>
          </div>
        </section>
      </section>

      <section className="landing-section py-10" aria-labelledby="setup-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="landing-kicker">Setup path</p>
            <h2 id="setup-title" className="mt-2 font-display text-xl uppercase tracking-widest text-primary">
              Set up the safety system
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Complete the required items before opening the Dashboard.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.25fr]">
          <div className="landing-panel p-5">
            <ol className="landing-setup-map">
              {SETUP_STAGES.map(([code, title, description, requirement]) => (
                <li key={code}>
                  <span className="landing-setup-map__code">{code}</span>
                  <span>
                    <span className="block text-xs text-primary">{title}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-widest text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {requirement}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="font-display text-xl uppercase tracking-widest text-primary">
              How the response path works
            </h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {AUTOMATON_STAGES.map(([code, title, description], index) => (
                <li key={code} className="landing-stage-card">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {code}
                  </div>
                  <div
                    className={`mt-1 font-display text-lg ${index >= 3 ? "text-destructive" : index === 0 ? "text-radar" : "text-primary"}`}
                  >
                    {title}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-foreground/75">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <footer className="landing-footer border-t border-border py-6 text-[10px] uppercase tracking-widest text-muted-foreground">
        Safety-only system. Not a replacement for calling emergency services.
      </footer>
    </main>
  );
}
