import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { analyze } from "@scriptc/compiler";

const repoRoot = join(import.meta.dirname, "../..");
const cacheDir = join(repoRoot, "node_modules/.cache/scriptc-tests");

/** JS class properties created only by later assignments are not a closed
 * own-key set. The static Object.values lowering must refuse rather than
 * listing an always-present slot the JS object may not have yet. */
test("Object.values fails closed for dynamically-present JS class fields", async () => {
  const source = `class RuntimeFields {
  constructor() { this.stable = 1; }
  addLater() { this.late = 2; }
}
const value = new RuntimeFields();
console.log(Object.values(value));
`;
  const key = createHash("sha256").update(source).digest("hex").slice(0, 16);
  const outDir = join(cacheDir, `object-enum-${key}`);
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, "dynamic-presence.js");
  writeFileSync(file, source);
  const result = analyze(file);
  expect(result.coverage.runtimeFences).toEqual([
    expect.objectContaining({
      code: "SC1090",
      message: expect.stringContaining("field 'late' is created by a later runtime assignment"),
    }),
  ]);
});
