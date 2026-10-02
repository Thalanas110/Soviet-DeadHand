import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ReadinessRail } from "@/components/deadhand/ReadinessRail";
import { loadSetupDestination } from "@/lib/setup-routing";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Dead Hand" },
      { name: "description", content: "Authenticate to the Dead Hand command post." },
      { property: "og:title", content: "Sign in · Dead Hand" },
      { property: "og:description", content: "Authenticate to the Dead Hand command post." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let routingPromise: Promise<void> | null = null;
    const routeAuthenticatedUser = () => {
      if (routingPromise) return routingPromise;
      routingPromise = loadSetupDestination()
        .then((destination) => {
          if (active) navigate({ to: destination, replace: true });
        })
        .catch(() => {
          if (active) toast.error("Could not load operator setup");
        })
        .finally(() => {
          routingPromise = null;
        });
      return routingPromise;
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void routeAuthenticatedUser();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void routeAuthenticatedUser();
    });
    return () => {
      active = false;
      void data.subscription.unsubscribe();
    };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        if (!data.session)
          toast.success("Confirmation sent. Check your email to activate the account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth" },
    });
    if (error) toast.error(error.message || "Google sign-in failed");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <ReadinessRail />
      <div className="plate relative w-full max-w-sm p-6">
        <div className="hazard -mx-6 -mt-6 mb-6 h-2" />
        <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
          Пост управления · Command post
        </p>
        <h1 className="mt-2 font-display text-2xl uppercase text-primary glow-amber">
          {mode === "in" ? "Допуск" : "Регистрация"}
        </h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {mode === "in" ? "Operator sign in" : "New operator"}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-input bg-panel px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">
            Password
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-input bg-panel px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            disabled={busy}
            className="w-full bg-primary py-3 font-display text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-50"
          >
            {busy ? "…" : mode === "in" ? "Войти · Enter" : "Создать · Create"}
          </button>
        </form>
        <button
          onClick={google}
          className="mt-3 w-full border border-border py-3 text-xs uppercase tracking-widest hover:border-primary"
        >
          Continue with Google
        </button>
        <button
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-4 w-full text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          {mode === "in" ? "No clearance? Register" : "Have clearance? Sign in"}
        </button>
      </div>
    </main>
  );
}
