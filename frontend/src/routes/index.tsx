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

const CAPABILITIES = [
  ["01", "Check-ins", "Set the moments that should receive a response from you."],
  ["02", "Connected devices", "Keep a phone or wearable in the monitoring loop."],
  ["03", "Trusted contacts", "Choose who is notified when the response path escalates."],
] as const;

function Landing() {
  return (
    <main className="landing-page relative mx-auto min-h-screen max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <ReadinessRail />

      <header className="landing-header">
        <div className="landing-brand">
          <span className="landing-brand__mark" aria-hidden="true">
            01
          </span>
          <div>
            <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">
              Dead Hand
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              Personal Safety Watchdog
            </p>
          </div>
        </div>
        <nav className="landing-nav" aria-label="Landing page">
          <a href="#system-map">How it works</a>
          <Link to="/auth">Sign in</Link>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero__copy">
          <div className="landing-index-line">
            <span>01 / 03</span>
            <span>Personal safety system</span>
          </div>
          <h1 id="hero-title" className="landing-hero__title">
            Safety is a system.
          </h1>
          <p className="landing-hero__lede">
            Dead Hand watches for missed check-ins, device silence, and configured distress signals
            - then follows the response path you choose.
          </p>
          <div className="landing-actions">
            <Link to="/auth" className="landing-action landing-action--primary">
              Begin setup
            </Link>
            <a href="#system-map" className="landing-action landing-action--quiet">
              See how it works
            </a>
          </div>
          <dl className="landing-proof-strip">
            <div>
              <dt>Setup</dt>
              <dd>/setup</dd>
            </div>
            <div>
              <dt>Dashboard</dt>
              <dd>/console</dd>
            </div>
            <div>
              <dt>Response states</dt>
              <dd>Q0-Q4</dd>
            </div>
          </dl>
        </div>

        <aside className="landing-monument" aria-labelledby="emblem-title">
          <div className="landing-monument__topline">
            <span id="emblem-title">Historical visual reference</span>
            <span>Object 01 / 01</span>
          </div>
          <div className="landing-monument__field">
            <span className="landing-monument__axis" aria-hidden="true" />
            <img
              className="landing-monument__image"
              src={EMBLEM_SRC}
              alt="Historical red emblem used as a visual reference for the product identity"
            />
            <span className="landing-monument__stamp" aria-hidden="true">
              SDH
            </span>
          </div>
          <div className="landing-monument__caption">
            <strong>Safety-only system</strong>
            <span>Historical visual reference. No political affiliation.</span>
          </div>
        </aside>
      </section>

      <section
        id="system-map"
        className="landing-section landing-capabilities"
        aria-labelledby="capabilities-title"
      >
        <div className="landing-section__heading">
          <div>
            <p className="landing-kicker">System map / 02</p>
            <h2 id="capabilities-title">What it watches</h2>
          </div>
          <p>One control surface for the signals that matter when you cannot safely communicate.</p>
        </div>
        <ol className="landing-capability-grid">
          {CAPABILITIES.map(([code, title, description]) => (
            <li key={code} className="landing-capability">
              <span className="landing-capability__code">{code}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-response" aria-labelledby="response-title">
        <div className="landing-section__heading">
          <div>
            <p className="landing-kicker">Response path / 03</p>
            <h2 id="response-title">Escalation stays explicit.</h2>
          </div>
          <p>
            Q0-Q4 is the product model: each state has a clear condition and a configured next step.
          </p>
        </div>
        <ol className="landing-response-path">
          {AUTOMATON_STAGES.map(([code, title, description], index) => (
            <li
              key={code}
              className={
                index >= 3 ? "landing-response-path__item is-alert" : "landing-response-path__item"
              }
            >
              <span className="landing-response-path__code">{code}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-setup" aria-labelledby="setup-title">
        <div className="landing-section__heading">
          <div>
            <p className="landing-kicker">Setup path</p>
            <h2 id="setup-title">Build your safety system.</h2>
          </div>
          <p>Complete the required items before opening the Dashboard.</p>
        </div>
        <ol className="landing-setup-grid">
          {SETUP_STAGES.map(([code, title, description, requirement]) => (
            <li key={code} className="landing-setup-item">
              <span className="landing-setup-item__code">{code}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <span className="landing-setup-item__status">{requirement}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="landing-footer">
        Safety-only system. Not a replacement for calling emergency services.
      </footer>
    </main>
  );
}
