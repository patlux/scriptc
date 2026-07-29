import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { globSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { analyze, compile } from "@scriptc/compiler";

const execFileAsync = promisify(execFile);
const repoRoot = join(import.meta.dirname, "../..");
const fixturesRoot = join(repoRoot, "tests/fixtures/npm-static/typecheck-graph");
const npmStaticRoot = join(repoRoot, "tests/fixtures/npm-static");
const cacheDir = join(repoRoot, "node_modules/.cache/scriptc-tests");
const sanitize = process.env["SCRIPTC_SAN"] === "1";
const deepPackages = [
  "typecheck-a",
  "typecheck-b",
  "typecheck-hop0",
  "typecheck-hop1",
  "typecheck-hop2",
  "typecheck-hop3",
] as const;

interface RunResult {
  stdout: Buffer;
  exitCode: number;
}

async function run(cmd: string, args: string[]): Promise<RunResult> {
  try {
    const { stdout } = await execFileAsync(cmd, args, { encoding: "buffer" });
    return { stdout, exitCode: 0 };
  } catch (err) {
    const e = err as { code?: unknown; stdout?: Buffer };
    if (typeof e.code !== "number" || !Buffer.isBuffer(e.stdout)) throw err;
    return { stdout: e.stdout, exitCode: e.code };
  }
}

async function buildDeepEntry(backend?: "c"): Promise<string> {
  const entry = join(fixturesRoot, "deep-entry.ts");
  const hash = createHash("sha256");
  const files = [
    entry,
    ...globSync(join(npmStaticRoot, "node_modules/typecheck-{a,b,hop0,hop1,hop2,hop3}/**/*.{js,d.ts,json}")),
  ].sort();
  for (const file of files) hash.update(file).update(readFileSync(file));
  const key = hash
    .update(sanitize ? "san" : "plain")
    .update(backend ?? "default")
    .digest("hex")
    .slice(0, 16);
  const outDir = join(cacheDir, `npm-static-typecheck-${key}`);
  mkdirSync(outDir, { recursive: true });
  const result = await compile(entry, {
    outPath: join(outDir, "program"),
    outDir,
    sanitize,
    npmStatic: deepPackages,
    ...(backend === undefined ? {} : { backend }),
  });
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
  }
  return result.binaryPath;
}

describe(`npm-static typecheck admission${sanitize ? " (sanitized)" : ""}`, () => {
  test.for([undefined, "c"] as const)(
    "deep entries execute opted-in transitive package initializers (%s backend)",
    async (backend) => {
      const entry = join(fixturesRoot, "deep-entry.ts");
      const { coverage } = analyze(entry, { npmStatic: deepPackages });
      expect(coverage.npmStatic).toEqual(deepPackages.map((pkg) => ({ package: pkg, status: "static" })));
      expect(coverage.preflightFailed).toBe(false);
      expect(coverage.stats.statementsTotal).toBeGreaterThan(0);

      const binary = await buildDeepEntry(backend);
      const [nodeResult, nativeResult] = await Promise.all([run("node", [entry]), run(binary, [])]);
      expect(nativeResult.stdout.toString("utf8")).toBe(nodeResult.stdout.toString("utf8"));
      expect(nativeResult.exitCode).toBe(nodeResult.exitCode);
    },
    120_000,
  );

  test("a lost declaration type guard stays package-static with checked-dynamic use sites", () => {
    const { coverage } = analyze(join(fixturesRoot, "typeguard.ts"), {
      npmStatic: ["typeguarded"],
    });
    expect(coverage.npmStatic).toEqual([{ package: "typeguarded", status: "static" }]);
    expect(coverage.preflightFailed).toBe(false);
    expect(coverage.diagnostics).toEqual([]);
  });
});
