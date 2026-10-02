import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/console", ru: "Пульт", en: "Console" },
  { to: "/devices", ru: "Узлы", en: "Devices" },
  { to: "/contacts", ru: "Связь", en: "Contacts" },
  { to: "/settings", ru: "Коды", en: "Codes" },
] as const;

export function Shell({ children, callsign }: { children: ReactNode; callsign?: string | undefined }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="mx-auto min-h-screen max-w-7xl pb-24 md:pb-8">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur md:px-6">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-radar animate-blink" />
          <span className="font-display text-xs uppercase tracking-[0.3em] text-primary">Мёртвая рука</span>
          {callsign && <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">· {callsign}</span>}
        </div>
        <nav className="hidden gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="px-3 py-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary" activeProps={{ className: "bg-secondary text-primary" }}>
              {n.ru} · {n.en}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive">
          Выход
        </button>
      </header>
      <main className="px-3 py-4 md:px-6 md:py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-panel pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center py-2.5 text-muted-foreground" activeProps={{ className: "text-primary glow-amber" }}>
            <span className="font-display text-sm">{n.ru}</span>
            <span className="text-[9px] uppercase tracking-widest">{n.en}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Panel({ title, code, children, className = "" }: { title: string; code?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`plate relative ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-[10px] uppercase tracking-[0.25em] text-primary">{title}</h2>
        {code && <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{code}</span>}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function Lamp({ on, tone = "radar", label }: { on: boolean; tone?: "radar" | "amber" | "alarm"; label: string }) {
  const color = !on ? "bg-muted" : tone === "radar" ? "bg-radar" : tone === "amber" ? "bg-amber" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color} ${on ? "shadow-[0_0_8px_currentColor]" : ""}`} />
      <span className="text-[10px] uppercase tracking-widest text-foreground/80">{label}</span>
    </div>
  );
}

export function fmtAgo(iso: string | null | undefined, now: number) {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}

export function fmtCountdown(ms: number) {
  const neg = ms < 0;
  const t = Math.abs(Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${neg ? "-" : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
