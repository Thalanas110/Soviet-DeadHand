export type DeadHandState = "Q0" | "Q1" | "Q2" | "Q3" | "Q4";
export type DeadHandResponse = "NONE" | "CORRECT" | "DURESS" | "UNSAFE";
export type AlarmState =
  "NORMAL" | "ARE_YOU_ALIVE" | "PROLONGED_NO_RESPONSE" | "CRITICAL_UNRESOLVED" | "RESOLVED";

export function alarmStateForAutomaton(state: DeadHandState): AlarmState {
  if (state === "Q0") return "NORMAL";
  if (state === "Q1") return "ARE_YOU_ALIVE";
  if (state === "Q2") return "PROLONGED_NO_RESPONSE";
  return "CRITICAL_UNRESOLVED";
}

const HOUR = 60 * 60 * 1000;

type TransitionInput = {
  state: DeadHandState;
  now: string;
  lastSignalAt?: string | null;
  windowStartedAt?: string | null;
  cycleStartedAt?: string | null;
  heartbeatOk?: boolean;
  response?: Exclude<DeadHandResponse, "NONE">;
};

export function classifyResponse(
  entry: string | { type: string } | null,
  correctPass: string,
  duressPass: string,
): DeadHandResponse {
  if (entry === null) return "NONE";
  if (typeof entry === "object" && entry.type === "UNSAFE_REPORT") return "UNSAFE";
  if (entry === duressPass) return "DURESS";
  if (entry === correctPass) return "CORRECT";
  return "DURESS";
}

export function nextState(input: TransitionInput): DeadHandState {
  const { state, response } = input;

  if (response) {
    if (state === "Q0") return response === "DURESS" ? "Q3" : "Q0";
    if (state === "Q1") {
      if (response === "CORRECT") return "Q0";
      if (response === "DURESS") return "Q3";
    }
    if (state === "Q2") {
      if (response === "CORRECT") return "Q0";
      if (response === "DURESS") return "Q3";
    }
    if (state === "Q3" && (response === "CORRECT" || response === "DURESS")) return "Q4";
    if (state === "Q4" && response === "CORRECT") return "Q1";
    return state;
  }

  const now = Date.parse(input.now);
  if (state === "Q0") {
    const lastSignal = input.lastSignalAt ? Date.parse(input.lastSignalAt) : now;
    return now - lastSignal >= 24 * HOUR ? "Q1" : "Q0";
  }
  if (state === "Q1") {
    if (input.heartbeatOk) return "Q0";
    const started = input.windowStartedAt ? Date.parse(input.windowStartedAt) : now;
    return now - started >= 72 * HOUR ? "Q2" : "Q1";
  }
  if (state === "Q2") {
    const started = input.windowStartedAt ? Date.parse(input.windowStartedAt) : now;
    return now - started >= 48 * HOUR ? "Q3" : "Q2";
  }
  if (state === "Q3" || state === "Q4") {
    const started = input.cycleStartedAt ? Date.parse(input.cycleStartedAt) : now;
    return now - started >= 120 * HOUR ? state : state;
  }
  return state;
}
