import { createFileRoute, Link } from "@tanstack/react-router";
import { ReadinessRail } from "@/components/deadhand/ReadinessRail";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dead Hand · Комплекс «Периметр» — Personal Safety Watchdog" },
      {
        name: "description",
        content:
          "24h silence detection, 72h safe challenge, 48h location challenge, and 120h liveliness-alert cycles.",
      },
      { property: "og:title", content: "Dead Hand · Комплекс «Периметр»" },
      {
        property: "og:description",
        content:
          "Server-authoritative personal safety watchdog with covert duress alarm and emergency contact cascade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const AUTOMATON_STAGES = [
  ["Q0", "НАБЛЮДЕНИЕ", "Monitoring. Registered devices report complete heartbeat signals."],
  ["Q1", "ВЫ В БЕЗОПАСНОСТИ?", "Are you safe? Silence opens a 72h response window."],
  ["Q2", "ГДЕ ВЫ?", "Where are you? A further 48h requires a direct response."],
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
    <main className="relative mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <ReadinessRail />
      <header className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <span className="inline-block h-3 w-3 rounded-full bg-radar animate-blink" />
          <span className="font-display text-sm uppercase tracking-[0.3em] text-primary">
            Мёртвая рука
          </span>
        </div>
        <Link
          to="/auth"
          className="border border-primary px-3 py-1.5 text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Вход · Sign in
        </Link>
      </header>

      <section className="grid gap-8 py-10 md:grid-cols-[1.3fr_1fr] md:py-16">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            Комплекс «Периметр» · Web setup dossier
          </p>
          <h1 className="mt-4 font-display text-5xl uppercase leading-[0.95] text-primary glow-amber md:text-7xl">
            Мёртвая
            <br />
            рука
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-foreground/85">
            Dead Hand is a defensive personal safety system. Establish the operator account, connect
            the reporting devices, and authorize the people who should receive an emergency
            dispatch.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="bg-primary px-6 py-3 font-display text-sm uppercase tracking-widest text-primary-foreground hover:brightness-110"
            >
              Begin setup
            </Link>
          </div>
          <ul className="mt-10 grid gap-3 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-2">
            <li className="setup-rule">Server-authoritative timers</li>
            <li className="setup-rule">AES-256-GCM sealed telemetry</li>
            <li className="setup-rule">Covert duress code</li>
            <li className="setup-rule">Replay-proof sequencing</li>
          </ul>
        </div>

        <div className="crt relative overflow-hidden p-5">
          <div className="relative">
            <div className="border-b border-border pb-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary">
                Настройка системы · Setup dossier
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Complete the required lines before using the Dashboard as the live command post.
              </p>
            </div>
            <ol className="landing-setup-map mt-4">
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
          </div>
          <p className="relative mt-5 border-t border-border pt-3 text-xs uppercase tracking-[0.3em] text-radar glow-radar">
            Канал зашифрован · Link sealed
          </p>
        </div>
      </section>

      <section className="border-t border-border py-10">
        <h2 className="font-display text-xl uppercase tracking-widest text-primary">
          Доктрина эскалации · Escalation doctrine
        </h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-5">
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
      </section>

      <footer className="border-t border-border py-6 text-[10px] uppercase tracking-widest text-muted-foreground">
        Safety-only system. Not a replacement for calling emergency services.
      </footer>
    </main>
  );
}
