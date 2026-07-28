/* Opt-in machine-readable island runtime-path trace.
 *
 * Contract: SCRIPTC_RUNTIME_TRACE must be an absolute file path. Every
 * dynamic executable installs the tracer and reports whether QuickJS was
 * actually initialized. Fully static executables do not install or link it.
 * Normal teardown atomically replaces the target with schema v1 JSON.
 * Invalid/relative/unwritable paths are best-effort no-ops: program output
 * and exit status are unchanged, and temporary files are removed.
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

type RequestedBackend = "c" | "default";

interface RuntimeTrace {
  schemaVersion: number;
  quickjsInitialized: boolean;
  islandInitializationCount: number;
  islandEntryCount: number;
  entryCountsByReason: Record<string, number>;
}

const zeroReasons = {
  eval: 0,
  module: 0,
  regex: 0,
  "host-callback": 0,
  jobs: 0,
  value: 0,
};

async function build(
  name: string,
  source: string,
  dynamic: boolean,
  requestedBackend: RequestedBackend,
): Promise<{ binaryPath: string; backend: "c" | "llvm" }> {
  const key = createHash("sha256")
    .update(source)
    .update(sanitize ? "san" : "plain")
    .update(dynamic ? "dynamic" : "static")
    .update(requestedBackend)
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
    ...(requestedBackend === "c" ? { backend: "c" as const } : {}),
  });
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
  }
  return { binaryPath: result.binaryPath, backend: result.backend };
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

for (const requestedBackend of ["c", "default"] as const) {
  describe(`runtime-path trace ${requestedBackend}${sanitize ? " (sanitized)" : ""}`, () => {
    test("is disabled by default and repeated entries initialize QuickJS once", async () => {
      const built = await build("disabled", islandSource, true, requestedBackend);
      if (requestedBackend === "default") expect(built.backend).toBe("llvm");
      const tracePath = join(cacheDir, `disabled-${requestedBackend}-${process.pid}-${sanitize ? "san" : "plain"}.json`);
      rmSync(tracePath, { force: true });
      const result = await run(built.binaryPath);
      expect(result.stdout).toBe("2\n4\n6\n");
      expect(result.stderr).toBe("");
      expect(existsSync(tracePath)).toBe(false);
    });

    test("writes schema v1 JSON with stable reason counts", async () => {
      const built = await build("enabled", islandSource, true, requestedBackend);
      if (requestedBackend === "default") expect(built.backend).toBe("llvm");
      const tracePath = join(cacheDir, `enabled-${requestedBackend}-${process.pid}-${sanitize ? "san" : "plain"}.json`);
      rmSync(tracePath, { force: true });
      const result = await run(built.binaryPath, tracePath);
      expect(result.stdout).toBe("2\n4\n6\n");
      expect(result.stderr).toBe("");
      expect(readTrace(tracePath)).toEqual({
        schemaVersion: 1,
        quickjsInitialized: true,
        islandInitializationCount: 1,
        islandEntryCount: 3,
        entryCountsByReason: { ...zeroReasons, eval: 3 },
      });
    });

    test("distinguishes fully static from island-free dynamic executables", async () => {
      const source = `console.log("static path");\n`;
      const [staticBuilt, dynamicBuilt] = await Promise.all([
        build("no-island-static", source, false, requestedBackend),
        build("no-island-dynamic", source, true, requestedBackend),
      ]);

      const staticTrace = join(cacheDir, `static-${requestedBackend}-${process.pid}-${sanitize ? "san" : "plain"}.json`);
      rmSync(staticTrace, { force: true });
      const staticResult = await run(staticBuilt.binaryPath, staticTrace);
      expect(staticResult.stdout).toBe("static path\n");
      expect(staticResult.stderr).toBe("");
      expect(existsSync(staticTrace)).toBe(false);

      const dynamicTrace = join(cacheDir, `dynamic-${requestedBackend}-${process.pid}-${sanitize ? "san" : "plain"}.json`);
      rmSync(dynamicTrace, { force: true });
      const dynamicResult = await run(dynamicBuilt.binaryPath, dynamicTrace);
      expect(dynamicResult.stdout).toBe("static path\n");
      expect(dynamicResult.stderr).toBe("");
      expect(readTrace(dynamicTrace)).toEqual({
        schemaVersion: 1,
        quickjsInitialized: false,
        islandInitializationCount: 0,
        islandEntryCount: 0,
        entryCountsByReason: zeroReasons,
      });
    });

    test("records regex-only dynamic QuickJS entry", async () => {
      const built = await build("regex-only", `console.log(/a+/.test("caa"));\n`, true, requestedBackend);
      const tracePath = join(cacheDir, `regex-${requestedBackend}-${process.pid}-${sanitize ? "san" : "plain"}.json`);
      rmSync(tracePath, { force: true });
      const result = await run(built.binaryPath, tracePath);
      expect(result.stdout).toBe("true\n");
      expect(result.stderr).toBe("");
      const trace = readTrace(tracePath);
      expect(trace.quickjsInitialized).toBe(true);
      expect(trace.islandInitializationCount).toBe(1);
      expect(trace.islandEntryCount).toBeGreaterThanOrEqual(1);
      expect(trace.entryCountsByReason.regex).toBeGreaterThanOrEqual(1);
    });

    test("explicit process.exit still flushes the trace once", async () => {
      const source = `console.log(__island_eval("1 + 1"));\nprocess.exit(0);\n`;
      const built = await build("explicit-exit", source, true, requestedBackend);
      const tracePath = join(cacheDir, `exit-${requestedBackend}-${process.pid}-${sanitize ? "san" : "plain"}.json`);
      rmSync(tracePath, { force: true });
      const result = await run(built.binaryPath, tracePath);
      expect(result.stdout).toBe("2\n");
      expect(result.stderr).toBe("");
      const trace = readTrace(tracePath);
      expect(trace.quickjsInitialized).toBe(true);
      expect(trace.islandInitializationCount).toBe(1);
      expect(trace.entryCountsByReason.eval).toBe(1);
    });

    test("trace write failures do not affect product behavior or leave temp files", async () => {
      const built = await build("write-failure", islandSource, true, requestedBackend);
      const targetDir = join(cacheDir, `trace-write-failure-${requestedBackend}-${process.pid}-${sanitize ? "san" : "plain"}`);
      mkdirSync(targetDir, { recursive: true });
      const result = await run(built.binaryPath, targetDir);
      expect(result.stdout).toBe("2\n4\n6\n");
      expect(result.stderr).toBe("");
      expect(readdirSync(targetDir)).toEqual([]);
    });
  });
}
