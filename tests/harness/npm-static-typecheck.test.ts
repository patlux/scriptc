import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { analyze } from "@scriptc/compiler";

const fixturesRoot = join(import.meta.dirname, "../fixtures/npm-static/typecheck-graph");

describe("npm-static typecheck admission", () => {
  test("deep entries keep opted-in transitive packages in the checked graph", () => {
    const { coverage } = analyze(join(fixturesRoot, "deep-entry.ts"), {
      npmStatic: [
        "typecheck-a",
        "typecheck-b",
        "typecheck-hop0",
        "typecheck-hop1",
        "typecheck-hop2",
        "typecheck-hop3",
      ],
    });
    expect(coverage.npmStatic).toEqual([
      { package: "typecheck-a", status: "static" },
      { package: "typecheck-b", status: "static" },
      { package: "typecheck-hop0", status: "static" },
      { package: "typecheck-hop1", status: "static" },
      { package: "typecheck-hop2", status: "static" },
      { package: "typecheck-hop3", status: "static" },
    ]);
    expect(coverage.preflightFailed).toBe(false);
  });

  test("a lost declaration type guard stays package-static with checked-dynamic use sites", () => {
    const { coverage } = analyze(join(fixturesRoot, "typeguard.ts"), {
      npmStatic: ["typeguarded"],
    });
    expect(coverage.npmStatic).toEqual([{ package: "typeguarded", status: "static" }]);
    expect(coverage.preflightFailed).toBe(false);
    expect(coverage.diagnostics).toEqual([]);
  });
});
