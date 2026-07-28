import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { globSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const execFileAsync = promisify(execFile);
const repoRoot = join(import.meta.dirname, "../..");
const fixtureRoot = join(repoRoot, "tests/fixtures/create-require");
const cacheDir = join(repoRoot, "node_modules/.cache/scriptc-tests");
const sanitize = process.env["SCRIPTC_SAN"] === "1";

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

async function build(entry: string, backend?: "c", dynamic = true): Promise<string> {
  const hash = createHash("sha256");
  for (const file of [entry, ...globSync(join(fixtureRoot, "**/*.{js,json}"))].sort()) {
    hash.update(file).update(readFileSync(file));
  }
  const key = hash
    .update(sanitize ? "san" : "plain")
    .update(backend ?? "default")
    .update(dynamic ? "dynamic" : "static")
    .digest("hex")
    .slice(0, 16);
  const outDir = join(cacheDir, `create-require-${key}`);
  mkdirSync(outDir, { recursive: true });
  const result = await compile(entry, {
    outPath: join(outDir, "program"),
    outDir,
    sanitize,
    dynamic,
    ...(backend === undefined ? {} : { backend }),
  });
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
  }
  return result.binaryPath;
}

async function expectDifferential(entryName: string, backend?: "c", argv: string[] = []): Promise<void> {
  const entry = join(fixtureRoot, entryName);
  const binary = await build(entry, backend);
  const [nodeResult, nativeResult] = await Promise.all([run("node", [entry, ...argv]), run(binary, argv)]);
  expect(nativeResult.stdout.toString("utf8")).toBe(nodeResult.stdout.toString("utf8"));
  expect(nativeResult.exitCode).toBe(nodeResult.exitCode);
}

describe(`createRequire admission${sanitize ? " (sanitized)" : ""}`, () => {
  test.for([undefined, "c"] as const)("literal require.resolve byte-matches Node (%s backend)", async (backend) => {
    await expectDifferential("literal-resolve.js", backend);
  }, 120_000);

  test.for([undefined, "c"] as const)("finite require specifier sets byte-match Node (%s backend)", async (backend) => {
    await expectDifferential("finite-set.js", backend, ["present"]);
    await expectDifferential("finite-set.js", backend);
  }, 120_000);

  test.for([undefined, "c"] as const)("runtime-dynamic require traps catchably (%s backend)", async (backend) => {
    await expectDifferential("dynamic-trap.js", backend);
  }, 120_000);

  test.for([undefined, "c"] as const)("guarded optional require falls back (%s backend)", async (backend) => {
    await expectDifferential("optional-probe.js", backend);
  }, 120_000);

  test("static build keeps a clear runtime fence for a dynamic createRequire call", async () => {
    const entry = join(fixtureRoot, "dynamic-trap.js");
    const binary = await build(entry, "c", false);
    const result = await run(binary, []);
    expect(result.stdout.toString("utf8")).toBe("true SC2020\n");
    expect(result.exitCode).toBe(0);
  }, 120_000);
});
