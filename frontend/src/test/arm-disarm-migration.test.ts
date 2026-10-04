import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationDir = join(dirname(fileURLToPath(import.meta.url)), "../../../supabase/migrations");

function latestMigration() {
  const name = readdirSync(migrationDir)
    .filter((entry) => entry.endsWith(".sql"))
    .sort()
    .reverse()
    .find((entry) =>
      readFileSync(join(migrationDir, entry), "utf8").includes(
        "create or replace function public.api_set_armed",
      ),
    );
  if (!name) throw new Error("No Supabase migrations found");
  return readFileSync(join(migrationDir, name), "utf8");
}

describe("arm/disarm migration contract", () => {
  it("rejects unconfigured and rejected passwords before updating armed state", () => {
    const sql = latestMigration();

    expect(sql).toMatch(
      /if _cls in \('UNCONFIGURED','REJECTED'\) then[\s\S]*case when _cls = 'UNCONFIGURED' then 'PINS_NOT_CONFIGURED' else 'PIN_REJECTED' end/,
    );
  });

  it("routes duress input to the existing Q3/Q4 escalation helper", () => {
    const sql = latestMigration();

    expect(sql).toMatch(
      /if _cls = 'DURESS' then[\s\S]*perform public\._open_duress\(_user, null, null\);[\s\S]*return jsonb_build_object\('ok', true, 'acknowledged_at', now\(\)\);/,
    );
  });

  it("keeps normal disarm gated on the safe Q0 automaton state", () => {
    const sql = latestMigration();

    expect(sql).toContain("if not _armed and st.automaton_state <> 'Q0' then");
    expect(sql).toMatch(/update safety_status\s+set armed = _armed/);
  });
});
