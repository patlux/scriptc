/* Opt-in machine-readable island runtime-path trace.
 *
 * Contract: SCRIPTC_RUNTIME_TRACE must be an absolute file path. Only a
 * dynamic executable whose emitted code can reach the island installs the
 * tracer. Normal teardown atomically replaces that file with schema v1 JSON.
 * Invalid/relative/unwritable paths are best-effort no-ops: program output and
 * exit status are unchanged, and temporary files are removed.
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const execFileAsync = promisify(execFile);
const repoRoot = join(import.meta.dirname, "../..");
const cacheDir = join(repoRoot, "node_modules/.cache/scriptc-tests");
const sanitize = process.env["SCRIPTC_SAN"] === "1";

interface RuntimeTrace {
  schemaVersion: number;
  quickjsInitialized: boolean;
  islandInitializationCount: number;
  islandEntryCount: number;
  entryCountsByReason: Record<string, number>;
}

async function build(name: string, source: string, dynamic = true): Promise<string> {
  const key = createHash("sha256")
    .update(source)
    .update(sanitize ? "san" : "plain")
    .update(dynamic ? "dynamic" : "static")
    .digest("hex")
    .slice(0, 16);
  const outDir = join(cacheDir, `runtime-trace-${key}`);
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${name}.ts`);
  writeFileSync(file, source);
  const result = await compile(file, {
    outPath: join(outDir, name),
    outDir,
    sanitize,
    dynamic,
    backend: "c",
  });
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
  }
  return result.binaryPath;
}

async function run(binary: string, tracePath?: string): Promise<{ stdout: string; stderr: string }> {
  const env = { ...process.env };
  if (tracePath === undefined) delete env["SCRIPTC_RUNTIME_TRACE"];
  else env["SCRIPTC_RUNTIME_TRACE"] = tracePath;
  return execFileAsync(binary, [], { encoding: "utf8", env });
}

function readTrace(path: string): RuntimeTrace {
  return JSON.parse(readFileSync(path, "utf8")) as RuntimeTrace;
}

const islandSource = `console.log(__island_eval("1 + 1"));
console.log(__island_eval("2 + 2"));
console.log(__island_eval("3 + 3"));
`;

describe(`runtime-path trace${sanitize ? " (sanitized)" : ""}`, () => {
  test("is disabled by default and repeated entries initialize QuickJS once", async () => {
    const binary = await build("disabled", islandSource);
    const tracePath = join(cacheDir, `disabled-${process.pid}-${sanitize ? "san" : "plain"}.json`);
    rmSync(tracePath, { force: true });
    const result = await run(binary);
    expect(result.stdout).toBe("2\n4\n6\n");
    expect(result.stderr).toBe("");
    expect(existsSync(tracePath)).toBe(false);
  });

  test("writes schema v1 JSON with stable reason counts", async () => {
    const binary = await build("enabled", islandSource);
    const tracePath = join(cacheDir, `enabled-${process.pid}-${sanitize ? "san" : "plain"}.json`);
    rmSync(tracePath, { force: true });
    const result = await run(binary, tracePath);
    expect(result.stdout).toBe("2\n4\n6\n");
    expect(result.stderr).toBe("");
    const trace = readTrace(tracePath);
    expect(trace).toEqual({
      schemaVersion: 1,
      quickjsInitialized: true,
      islandInitializationCount: 1,
      islandEntryCount: 3,
      entryCountsByReason: {
        eval: 3,
        module: 0,
        regex: 0,
        "host-callback": 0,
        jobs: 0,
        value: 0,
      },
    });
  });

  test("does not link tracing into static or island-free dynamic executables", async () => {
    const source = `console.log("static path");\n`;
    const [staticBinary, dynamicBinary] = await Promise.all([
      build("no-island-static", source, false),
      build("no-island-dynamic", source, true),
    ]);
    for (const [kind, binary] of [["static", staticBinary], ["dynamic", dynamicBinary]] as const) {
      const tracePath = join(cacheDir, `no-island-${kind}-${process.pid}-${sanitize ? "san" : "plain"}.json`);
      rmSync(tracePath, { force: true });
      const result = await run(binary, tracePath);
      expect(result.stdout).toBe("static path\n");
      expect(result.stderr).toBe("");
      expect(existsSync(tracePath)).toBe(false);
    }
  });

  test("trace write failures do not affect product behavior or leave temp files", async () => {
    const binary = await build("write-failure", islandSource);
    const targetDir = join(cacheDir, `trace-write-failure-${process.pid}-${sanitize ? "san" : "plain"}`);
    mkdirSync(targetDir, { recursive: true });
    const result = await run(binary, targetDir);
    expect(result.stdout).toBe("2\n4\n6\n");
    expect(result.stderr).toBe("");
    expect(readdirSync(targetDir)).toEqual([]);
  });
});
