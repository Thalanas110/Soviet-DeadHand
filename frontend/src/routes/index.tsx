import { createFileRoute, Link } from "@tanstack/react-router";
import { ReadinessRail } from "@/components/deadhand/ReadinessRail";

const EMBLEM_SRC = "/c4ff83c5eadddc1a6627fbce57d559e0.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dead Hand · Комплекс «Периметр» — Personal Safety Watchdog" },
      {
        name: "description",
        content:
          "Personal safety setup for check-ins, trusted contacts, and server-authoritative emergency escalation.",
      },
      { property: "og:title", content: "Dead Hand · Комплекс «Периметр»" },
      {
        property: "og:description",
        content:
          "A defensive personal safety system for check-ins, trusted contacts, and emergency escalation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const AUTOMATON_STAGES = [
  ["Q0", "НАБЛЮДЕНИЕ", "Monitoring. Registered devices report complete heartbeat signals."],
  ["Q1", "ВЫ В БЕЗОПАСНОСТИ?", "Are you safe? Silence opens the configured response window."],
  ["Q2", "ГДЕ ВЫ?", "Where are you? A further silence requires a direct response."],
  ["Q3", "ВНИМАНИЕ!", "Attention. The emergency contact cascade is active."],
  ["Q4", "ТРЕВОГА ЖИВУЧЕСТИ", "Liveliness alert. Correct rescue returns the system to Q1."],
] as const;

const SETUP_STAGES = [
  ["01", "КОДЫ ДОСТУПА", "Access passwords", "Required"],
  ["02", "ТЕЛЕФОН", "Primary handset", "Required"],
  ["03", "ЦЕПЬ ОПОВЕЩЕНИЯ", "Emergency cascade", "Required"],
  ["04", "НАРУЧНЫЙ УЗЕЛ", "Wearable bridge", "Recommended"],
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
            <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">
              Мёртвая рука
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              Комплекс «Периметр»
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

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="landing-kicker">
            Комплекс «Периметр» <span>· Web setup dossier</span>
          </p>
          <h1 className="mt-5 font-display text-5xl uppercase leading-[0.9] text-primary glow-amber md:text-8xl">
            Мёртвая
            <br />
            рука
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-foreground/85">
            A defensive personal safety system for check-ins, trusted contacts, and emergency
            escalation when you cannot safely communicate.
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
              <dt>Entry</dt>
              <dd>/setup</dd>
            </div>
            <div>
              <dt>Command post</dt>
              <dd>/console</dd>
            </div>
            <div>
              <dt>Doctrine</dt>
              <dd>Q0–Q4</dd>
            </div>
          </dl>
        </div>

        <div className="landing-seal plate" aria-label="Soviet Dead Hand emblem">
          <div className="landing-seal__header">
            <span>System emblem</span>
            <span>01 / 01</span>
          </div>
          <div className="landing-seal__art">
            <span
              className="landing-seal__crosshair landing-seal__crosshair--top"
              aria-hidden="true"
            />
            <img src={EMBLEM_SRC} alt="Red star, hammer, sickle, and wheat emblem" />
            <span
              className="landing-seal__crosshair landing-seal__crosshair--bottom"
              aria-hidden="true"
            />
          </div>
          <div className="landing-seal__footer">
            <strong>Safety-only system</strong>
            <span>Not a replacement for emergency services.</span>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="landing-kicker">Настройка системы · Setup dossier</p>
            <h2 className="mt-2 font-display text-xl uppercase tracking-widest text-primary">
              Establish the operator station
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Complete the required lines before using the Dashboard as the live command post.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.25fr]">
          <div className="crt p-5">
            <ol className="landing-setup-map">
              {SETUP_STAGES.map(([code, ru, en, requirement]) => (
                <li key={code}>
                  <span className="landing-setup-map__code">{code}</span>
                  <span>
                    <span className="block text-xs text-primary">{ru}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-widest text-muted-foreground">
                      {en}
                    </span>
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {requirement}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 border-t border-border pt-3 text-xs uppercase tracking-[0.3em] text-radar glow-radar">
              Канал зашифрован · Link sealed
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl uppercase tracking-widest text-primary">
              Доктрина эскалации · Escalation doctrine
            </h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {AUTOMATON_STAGES.map(([code, ru, en], i) => (
                <li key={code} className="plate relative p-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {code}
                  </div>
                  <div
                    className={`mt-1 font-display text-lg ${i === 3 || i === 4 ? "text-destructive glow-alarm" : i === 0 ? "text-radar" : "text-primary"}`}
                  >
                    {ru}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-foreground/75">{en}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-[10px] uppercase tracking-widest text-muted-foreground">
        Safety-only system. Not a replacement for calling emergency services.
      </footer>
    </main>
  );
}
