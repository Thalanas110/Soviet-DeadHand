import { describe, expect, it } from "vitest";
import {
  alarmStateForAutomaton,
  classifyResponse,
  nextState,
  type DeadHandState,
} from "@/lib/deadhand-state";

const at = (hours: number) => new Date(hours * 60 * 60 * 1000).toISOString();

describe("Dead Hand Q0-Q4 automaton", () => {
  it("starts the safe challenge after 24 hours without a signal", () => {
    expect(nextState({ state: "Q0", now: at(24), lastSignalAt: at(0) })).toBe("Q1");
  });

  it("moves through the 72-hour and 48-hour response windows", () => {
    expect(nextState({ state: "Q1", now: at(72), windowStartedAt: at(0) })).toBe("Q2");
    expect(nextState({ state: "Q2", now: at(48), windowStartedAt: at(0) })).toBe("Q3");
  });

  it("resends the Q3/Q4 alert on 120-hour cycles", () => {
    expect(nextState({ state: "Q3", now: at(120), cycleStartedAt: at(0) })).toBe("Q3");
    expect(nextState({ state: "Q4", now: at(120), cycleStartedAt: at(0) })).toBe("Q4");
  });

  it("handles password, duress, and unsafe responses per state", () => {
    const cases: Array<[DeadHandState, "CORRECT" | "DURESS" | "UNSAFE", DeadHandState]> = [
      ["Q1", "CORRECT", "Q0"],
      ["Q1", "DURESS", "Q3"],
      ["Q2", "CORRECT", "Q0"],
      ["Q2", "DURESS", "Q3"],
      ["Q3", "CORRECT", "Q4"],
      ["Q3", "DURESS", "Q4"],
      ["Q4", "CORRECT", "Q1"],
      ["Q4", "DURESS", "Q4"],
      ["Q4", "UNSAFE", "Q4"],
    ];

    for (const [state, response, expected] of cases) {
      expect(nextState({ state, response, now: at(1) })).toBe(expected);
    }
  });

  it("treats missing, wrong, and duress passwords as the specified response types", () => {
    expect(classifyResponse(null, "check-in", "duress")).toBe("NONE");
    expect(classifyResponse("check-in", "check-in", "duress")).toBe("CORRECT");
    expect(classifyResponse("duress", "check-in", "duress")).toBe("DURESS");
    expect(classifyResponse("wrong", "check-in", "duress")).toBe("DURESS");
    expect(classifyResponse({ type: "UNSAFE_REPORT" }, "check-in", "duress")).toBe("UNSAFE");
  });

  it("keeps semantic alarm states separate from q-node automaton states", () => {
    expect(alarmStateForAutomaton("Q0")).toBe("NORMAL");
    expect(alarmStateForAutomaton("Q1")).toBe("ARE_YOU_ALIVE");
    expect(alarmStateForAutomaton("Q2")).toBe("PROLONGED_NO_RESPONSE");
    expect(alarmStateForAutomaton("Q3")).toBe("CRITICAL_UNRESOLVED");
    expect(alarmStateForAutomaton("Q4")).toBe("CRITICAL_UNRESOLVED");
  });
});
