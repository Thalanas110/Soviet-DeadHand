import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dead Hand · Комплекс «Периметр» — Personal Safety Watchdog" },
      { name: "description", content: "If you go silent, Dead Hand notices. 72h watchdog, covert duress code, and an encrypted emergency contact cascade." },
      { property: "og:title", content: "Dead Hand · Комплекс «Периметр»" },
      { property: "og:description", content: "Server-authoritative personal safety watchdog with covert duress alarm and emergency contact cascade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STAGES = [
  ["СОСТ-0", "НОРМА", "Complete heartbeats with location keep the watchdog satisfied."],
  ["СОСТ-1", "ВЫ ЖИВЫ?", "72 hours without a complete heartbeat. You are challenged to check in."],
  ["СОСТ-2", "НЕТ ОТВЕТА", "48 more hours with no response. The incident is escalated."],
  ["СОСТ-3", "КРИТИЧЕСКОЕ", "Emergency notification cascade executes to your authorized contacts."],
  ["СОСТ-4", "УРЕГУЛИРОВАНО", "You check in with your PIN. The incident is closed on the record."],
];

function Landing() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <span className="inline-block h-3 w-3 rounded-full bg-radar animate-blink" />
          <span className="font-display text-sm uppercase tracking-[0.3em] text-primary">Мёртвая рука</span>
        </div>
        <Link to="/auth" className="border border-primary px-3 py-1.5 text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground">
          Вход · Sign in
        </Link>
      </header>

      <section className="grid gap-8 py-10 md:grid-cols-[1.3fr_1fr] md:py-16">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Комплекс «Периметр» · Personal edition</p>
          <h1 className="mt-4 font-display text-5xl uppercase leading-[0.95] text-primary glow-amber md:text-7xl">
            Dead
            <br />
            Hand
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-foreground/85">
            A defensive personal safety system. Your handset and wearable report in. If they go silent, the server
            notices, challenges you, and, if you still don't answer, alerts the people you trust with your last known
            position.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="bg-primary px-6 py-3 font-display text-sm uppercase tracking-widest text-primary-foreground hover:brightness-110">
              Взвести систему · Arm the system
            </Link>
          </div>
          <ul className="mt-10 grid gap-2 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-2">
            <li>▸ Server-authoritative timers</li>
            <li>▸ AES-256-GCM sealed telemetry</li>
            <li>▸ Covert duress code</li>
            <li>▸ Replay-proof sequencing</li>
          </ul>
        </div>

        <div className="crt relative overflow-hidden p-5">
          <div className="relative mx-auto aspect-square max-w-xs rounded-full border border-radar/40">
            <div className="absolute inset-[18%] rounded-full border border-radar/30" />
            <div className="absolute inset-[36%] rounded-full border border-radar/20" />
            <div className="absolute inset-0 animate-sweep rounded-full" style={{ background: "conic-gradient(from 0deg, transparent 0 300deg, color-mix(in oklch, var(--color-radar) 45%, transparent) 360deg)" }} />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radar" />
          </div>
          <p className="relative mt-4 text-center text-xs uppercase tracking-[0.3em] text-radar glow-radar">Канал зашифрован · Link sealed</p>
        </div>
      </section>

      <section className="border-t border-border py-10">
        <h2 className="font-display text-xl uppercase tracking-widest text-primary">Escalation doctrine</h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-5">
          {STAGES.map(([code, ru, en], i) => (
            <li key={code} className="plate relative p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{code}</div>
              <div className={`mt-1 font-display text-lg ${i === 3 ? "text-destructive glow-alarm" : i === 0 || i === 4 ? "text-radar" : "text-primary"}`}>{ru}</div>
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
