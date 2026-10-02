import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { bootstrap } from "@/lib/deadhand.functions";

export function useOperator() {
  const qc = useQueryClient();
  const boot = useServerFn(bootstrap);

  const q = useQuery({
    queryKey: ["operator"],
    queryFn: async () => {
      await boot();
      const [status, profile, devices, events, dispatches, incidents] = await Promise.all([
        supabase.from("safety_status").select("*").maybeSingle(),
        supabase.from("profiles").select("id, callsign, pins_configured, created_at").maybeSingle(),
        supabase.from("devices").select("id, label, kind, last_seq, last_seen_at, last_complete_at, created_at, revoked_at").order("created_at"),
        supabase.from("incident_events").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("notification_dispatches").select("id, incident_id, contact_id, priority, status, created_at, sent_at, attempts").order("created_at", { ascending: false }).limit(30),
        supabase.from("incidents").select("*").order("opened_at", { ascending: false }).limit(10),
      ]);
      return {
        status: status.data,
        profile: profile.data,
        devices: devices.data ?? [],
        events: events.data ?? [],
        dispatches: dispatches.data ?? [],
        incidents: incidents.data ?? [],
      };
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("operator-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "safety_status" }, () => qc.invalidateQueries({ queryKey: ["operator"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_events" }, () => qc.invalidateQueries({ queryKey: ["operator"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () => qc.invalidateQueries({ queryKey: ["operator"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "notification_dispatches" }, () => qc.invalidateQueries({ queryKey: ["operator"] }))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return q;
}

export function useNow(intervalMs = 1000) {
  const qc = useQueryClient();
  void qc;
  const q = useQuery({ queryKey: ["now", intervalMs], queryFn: () => Date.now(), refetchInterval: intervalMs, staleTime: 0 });
  return q.data ?? Date.now();
}
