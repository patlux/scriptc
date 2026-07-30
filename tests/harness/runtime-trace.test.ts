/* Opt-in artifact-bound runtime trace schema v2.
 *
 * Contract: a --dynamic artifact embeds compiler-owned deterministic static
 * inventories. SCRIPTC_RUNTIME_TRACE merely selects an absolute output path;
 * it cannot supply package/module/extension claims. Tracing is disabled by
 * default. Schema v1 is intentionally not accepted as v2.
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { compile, type CompileOptions } from "@scriptc/compiler";

const execFileAsync = promisify(execFile);
const repoRoot = join(import.meta.dirname, "../..");
const cacheDir = join(repoRoot, "node_modules/.cache/scriptc-tests");
const sanitize = process.env["SCRIPTC_SAN"] === "1";

type RequestedBackend = "c" | "default";

interface RuntimeTrace {
  schemaVersion: 2;
  quickjsInitialized: boolean;
  islandInitializationCount: number;
  islandEntryCount: number;
  entryCountsByReason: Record<string, number>;
  npmStaticPackages: string[];
  npmStaticPackageCount: number;
  compiledStaticModules: string[];
  executedStaticModules: string[];
  compiledStaticModuleCount: number;
  executedStaticModuleCount: number;
  compiledExtensions: string[];
  compiledExtensionCount: number;
}

const zeroReasons = {
  eval: 0,
  module: 0,
  regex: 0,
  "host-callback": 0,
  jobs: 0,
  value: 0,
};

function buildKey(parts: readonly string[]): string {
  return createHash("sha256")
    .update(parts.join("\0"))
    .update(sanitize ? "san" : "plain")
    .digest("hex")
    .slice(0, 16);
}

async function buildFile(
  name: string,
  file: string,
  requestedBackend: RequestedBackend,
  options: Partial<CompileOptions> = {},
): Promise<{ binaryPath: string; backend: "c" | "llvm"; cPath: string }> {
  const source = readFileSync(file, "utf8");
  const key = buildKey([name, file, source, requestedBackend, JSON.stringify(options)]);
  const outDir = join(cacheDir, `runtime-trace-${key}`);
  mkdirSync(outDir, { recursive: true });
  const result = await compile(file, {
    outPath: join(outDir, name),
    outDir,
    sanitize,
    dynamic: true,
    ...(requestedBackend === "c" ? { backend: "c" as const } : {}),
    ...options,
  });
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
  }
  return { binaryPath: result.binaryPath, backend: result.backend, cPath: result.cPath };
}

async function buildGraph(
  name: string,
  requestedBackend: RequestedBackend,
  rootTag: string,
): Promise<{ binaryPath: string; backend: "c" | "llvm"; root: string }> {
  const files = {
    "main.ts": `import { eager } from "./eager.ts";\nconsole.log(eager());\nif (process.argv.length > 99) import("./lazy.ts");\n`,
    "eager.ts": `export function eager(): string { return "eager"; }\n`,
    "lazy.ts": `console.log("lazy");\nexport const value: number = 1;\n`,
  };
  const key = buildKey([name, requestedBackend, rootTag, ...Object.values(files)]);
  const root = join(tmpdir(), `scriptc-runtime-trace-graph-${rootTag}-${process.pid}-${key}`);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const [file, source] of Object.entries(files)) writeFileSync(join(root, file), source);
  const built = await buildFile(name, join(root, "main.ts"), requestedBackend, {
    runtimeTraceExtensions: ["vendor/zeta@2", "vendor.alpha"],
  });
  return { ...built, root };
}

async function run(binary: string, tracePath?: string): Promise<{ stdout: string; stderr: string }> {
  const env = { ...process.env };
  if (tracePath === undefined) delete env["SCRIPTC_RUNTIME_TRACE"];
  else env["SCRIPTC_RUNTIME_TRACE"] = tracePath;
  return execFileAsync(binary, [], { encoding: "utf8", env });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCountRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "number");
}

function readTrace(path: string): RuntimeTrace {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (
    !isRecord(value) || value["schemaVersion"] !== 2 ||
    typeof value["quickjsInitialized"] !== "boolean" ||
    typeof value["islandInitializationCount"] !== "number" ||
    typeof value["islandEntryCount"] !== "number" ||
    !isCountRecord(value["entryCountsByReason"]) ||
    !isStringArray(value["npmStaticPackages"]) ||
    typeof value["npmStaticPackageCount"] !== "number" ||
    !isStringArray(value["compiledStaticModules"]) ||
    !isStringArray(value["executedStaticModules"]) ||
    typeof value["compiledStaticModuleCount"] !== "number" ||
    typeof value["executedStaticModuleCount"] !== "number" ||
    !isStringArray(value["compiledExtensions"]) ||
    typeof value["compiledExtensionCount"] !== "number"
  ) {
    throw new Error(`runtime trace is not complete schema v2: ${readFileSync(path, "utf8")}`);
  }
  return {
    schemaVersion: 2,
    quickjsInitialized: value["quickjsInitialized"],
    islandInitializationCount: value["islandInitializationCount"],
    islandEntryCount: value["islandEntryCount"],
    entryCountsByReason: value["entryCountsByReason"],
    npmStaticPackages: value["npmStaticPackages"],
    npmStaticPackageCount: value["npmStaticPackageCount"],
    compiledStaticModules: value["compiledStaticModules"],
    executedStaticModules: value["executedStaticModules"],
    compiledStaticModuleCount: value["compiledStaticModuleCount"],
    executedStaticModuleCount: value["executedStaticModuleCount"],
    compiledExtensions: value["compiledExtensions"],
    compiledExtensionCount: value["compiledExtensionCount"],
  };
}

function tracePath(label: string, backend: RequestedBackend): string {
  return join(cacheDir, `${label}-${backend}-${process.pid}-${sanitize ? "san" : "plain"}.json`);
}

const islandSource = `console.log(__island_eval("1 + 1"));\nconsole.log(__island_eval("2 + 2"));\nconsole.log(__island_eval("3 + 3"));\n`;

for (const requestedBackend of ["c", "default"] as const) {
  describe(`runtime trace schema v2 ${requestedBackend}${sanitize ? " (sanitized)" : ""}`, () => {
    test("embeds deterministic relocation-safe compiled/executed inventories", async () => {
      const first = await buildGraph("inventory", requestedBackend, "a");
      const second = await buildGraph("inventory", requestedBackend, "b");
      if (requestedBackend === "default") expect(first.backend).toBe("llvm");
      const firstPath = tracePath("inventory-a", requestedBackend);
      const secondPath = tracePath("inventory-b", requestedBackend);
      rmSync(firstPath, { force: true });
      rmSync(secondPath, { force: true });
      expect((await run(first.binaryPath, firstPath)).stdout).toBe("eager\n");
      expect((await run(second.binaryPath, secondPath)).stdout).toBe("eager\n");
      const one = readTrace(firstPath);
      const two = readTrace(secondPath);
      expect(one.schemaVersion).toBe(2);
      expect(one.quickjsInitialized).toBe(false);
      expect(one.islandInitializationCount).toBe(0);
      expect(one.islandEntryCount).toBe(0);
      expect(one.entryCountsByReason).toEqual(zeroReasons);
      expect(one.npmStaticPackages).toEqual([]);
      expect(one.npmStaticPackageCount).toBe(0);
      expect(one.compiledExtensions).toEqual(["vendor.alpha", "vendor/zeta@2"]);
      expect(one.compiledExtensionCount).toBe(2);
      expect(one.compiledStaticModuleCount).toBe(3);
      expect(one.executedStaticModuleCount).toBe(2);
      expect(one.compiledStaticModules).toHaveLength(3);
      expect(one.executedStaticModules).toHaveLength(2);
      expect(one.compiledStaticModules).toEqual([...one.compiledStaticModules].sort());
      expect(one.executedStaticModules.every((id) => one.compiledStaticModules.includes(id))).toBe(true);
      expect(one.compiledStaticModules.every((id) => /^local:sha256:[0-9a-f]{64}$/.test(id))).toBe(true);
      expect(JSON.stringify(one)).not.toContain(first.root);
      expect(JSON.stringify(two)).not.toContain(second.root);
      expect(two.compiledStaticModules).toEqual(one.compiledStaticModules);
      expect(two.executedStaticModules).toEqual(one.executedStaticModules);
    });

    test("is disabled by default", async () => {
      const root = join(cacheDir, `runtime-trace-disabled-${requestedBackend}`);
      mkdirSync(root, { recursive: true });
      const file = join(root, "main.ts");
      writeFileSync(file, islandSource);
      const built = await buildFile("disabled", file, requestedBackend);
      const path = tracePath("disabled", requestedBackend);
      rmSync(path, { force: true });
      const result = await run(built.binaryPath);
      expect(result.stdout).toBe("2\n4\n6\n");
      expect(result.stderr).toBe("");
      expect(existsSync(path)).toBe(false);
    });

    test("preserves exact once-only QuickJS counters in schema v2", async () => {
      const root = join(cacheDir, `runtime-trace-island-${requestedBackend}`);
      mkdirSync(root, { recursive: true });
      const file = join(root, "main.ts");
      writeFileSync(file, islandSource);
      const built = await buildFile("island", file, requestedBackend);
      const path = tracePath("island", requestedBackend);
      rmSync(path, { force: true });
      const result = await run(built.binaryPath, path);
      expect(result.stdout).toBe("2\n4\n6\n");
      expect(result.stderr).toBe("");
      const trace = readTrace(path);
      expect(trace.schemaVersion).toBe(2);
      expect(trace.quickjsInitialized).toBe(true);
      expect(trace.islandInitializationCount).toBe(1);
      expect(trace.islandEntryCount).toBe(3);
      expect(trace.entryCountsByReason).toEqual({ ...zeroReasons, eval: 3 });
      expect(trace.compiledStaticModuleCount).toBe(1);
      expect(trace.executedStaticModuleCount).toBe(1);
    });
  });
}

describe(`runtime trace schema v2 focused contracts${sanitize ? " (sanitized)" : ""}`, () => {
  test("records the exact npm-static package and package-relative module identities", async () => {
    const fixture = join(repoRoot, "tests/fixtures/npm-static/ms-cli.ts");
    const built = await buildFile("npm-static", fixture, "c", { npmStatic: ["ms"] });
    const path = tracePath("npm-static", "c");
    rmSync(path, { force: true });
    const result = await run(built.binaryPath, path);
    expect(result.stderr).toBe("");
    const trace = readTrace(path);
    expect(trace.npmStaticPackages).toEqual(["ms"]);
    expect(trace.npmStaticPackageCount).toBe(1);
    expect(trace.compiledStaticModules.some((id) => id === "npm:ms:index.js")).toBe(true);
    expect(trace.executedStaticModules).toContain("npm:ms:index.js");
    expect(JSON.stringify(trace)).not.toContain(repoRoot);
  });

  test("rejects unsafe, duplicate, and static-only extension metadata", async () => {
    const root = join(cacheDir, "runtime-trace-invalid-options");
    mkdirSync(root, { recursive: true });
    const file = join(root, "main.ts");
    writeFileSync(file, `console.log("ok");\n`);
    const base = { outPath: join(root, "out"), outDir: root };
    const unsafe = await compile(file, { ...base, dynamic: true, runtimeTraceExtensions: ["../escape"] });
    const duplicate = await compile(file, { ...base, dynamic: true, runtimeTraceExtensions: ["same", "same"] });
    const staticOnly = await compile(file, { ...base, dynamic: false, runtimeTraceExtensions: ["valid"] });
    expect(unsafe.ok).toBe(false);
    expect(duplicate.ok).toBe(false);
    expect(staticOnly.ok).toBe(false);
    if (!unsafe.ok) expect(unsafe.diagnostics[0]?.message).toContain("unsafe runtime trace extension identity");
    if (!duplicate.ok) expect(duplicate.diagnostics[0]?.message).toContain("duplicate runtime trace extension identity");
    if (!staticOnly.ok) expect(staticOnly.diagnostics[0]?.message).toContain("require a --dynamic build");
  });

  test("fully static artifacts still write no trace", async () => {
    const root = join(cacheDir, "runtime-trace-fully-static");
    mkdirSync(root, { recursive: true });
    const file = join(root, "main.ts");
    writeFileSync(file, `console.log("static");\n`);
    const result = await compile(file, {
      outPath: join(root, "static"),
      outDir: root,
      sanitize,
      dynamic: false,
      backend: "c",
    });
    if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join("\n"));
    const path = tracePath("fully-static", "c");
    rmSync(path, { force: true });
    expect((await run(result.binaryPath, path)).stdout).toBe("static\n");
    expect(existsSync(path)).toBe(false);
  });

  test("explicit process.exit flushes full v2 and write failures stay neutral", async () => {
    const root = join(cacheDir, "runtime-trace-exit");
    mkdirSync(root, { recursive: true });
    const file = join(root, "main.ts");
    writeFileSync(file, `console.log(__island_eval("1 + 1"));\nprocess.exit(0);\n`);
    const built = await buildFile("exit", file, "c");
    const path = tracePath("exit", "c");
    rmSync(path, { force: true });
    expect((await run(built.binaryPath, path)).stdout).toBe("2\n");
    expect(readTrace(path).schemaVersion).toBe(2);

    const targetDir = join(cacheDir, `trace-write-failure-${process.pid}-${sanitize ? "san" : "plain"}`);
    mkdirSync(targetDir, { recursive: true });
    const failedWrite = await run(built.binaryPath, targetDir);
    expect(failedWrite.stdout).toBe("2\n");
    expect(failedWrite.stderr).toBe("");
    expect(readdirSync(targetDir)).toEqual([]);
  });
});
