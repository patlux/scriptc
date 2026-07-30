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
test("fixed generic catalog enumeration and assign compile without fences", () => {
  const file = join(repoRoot, "tests/corpus/2703-object-catalog-records.ts");
  const result = analyze(file);
  expect(result.coverage.diagnostics).toEqual([]);
  expect(result.coverage.runtimeFences ?? []).toEqual([]);
  expect(result.coverage.stats.statementsFailed).toBe(0);
});

test("catalog lowering keeps dynamic and presence-sensitive shapes fenced", () => {
  const cases = [
    {
      name: "map-values-in-generic",
      source: `function values<T extends object>(value: T) { return Object.values(value); }
console.log(values(new Map<string, number>()).length);
`,
    },
    {
      name: "computed-spread-source",
      source: `type Groups = Record<string, Record<string, object>>;
type Id<T extends Groups> = { [K in keyof T]: keyof T[K] }[keyof T] & string;
type Catalog<T extends Groups> = { [K in Id<T>]: { id: K } };
function flatten<const T extends Groups>(groups: T): Catalog<T> {
  const sources = Object.values(groups);
  return Object.assign({}, ...sources) as Catalog<T>;
}
console.log(flatten({ one: { a: { id: "a" } } }).a.id);
`,
    },
  ];
  for (const { name, source } of cases) {
    const key = createHash("sha256").update(source).digest("hex").slice(0, 16);
    const outDir = join(cacheDir, `object-enum-${key}`);
    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, `${name}.ts`);
    writeFileSync(file, source);
    const result = analyze(file);
    expect(result.coverage.stats.statementsFailed, name).toBeGreaterThan(0);
  }
});

test("Object.values fails closed for dynamically-present JS class fields", () => {
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
