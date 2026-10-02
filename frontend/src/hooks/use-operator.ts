import { useQuery } from "@tanstack/react-query";
import { operatorApi } from "@/lib/api";

export function useOperator() {
  const q = useQuery({
    queryKey: ["operator"],
    queryFn: async () => {
      await operatorApi.action({ action: "bootstrap" });
      return operatorApi.read();
    },
    refetchInterval: 10_000,
  });

  return q;
}

export function useNow(intervalMs = 1000) {
  const q = useQuery({
    queryKey: ["now", intervalMs],
    queryFn: () => Date.now(),
    refetchInterval: intervalMs,
    staleTime: 0,
  });
  return q.data ?? Date.now();
}
