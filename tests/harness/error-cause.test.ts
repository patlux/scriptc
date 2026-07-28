import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const execFileAsync = promisify(execFile);
const repoRoot = join(import.meta.dirname, "../..");
const cacheDir = join(tmpdir(), "scriptc-error-cause-tests");
const sanitize = process.env["SCRIPTC_SAN"] === "1";

interface RunResult {
  stdout: Buffer;
  stderr: Buffer;
  exitCode: number;
}

async function run(cmd: string, args: string[]): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, { encoding: "buffer" });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    if (
      typeof err !== "object" || err === null ||
      !("code" in err) || typeof err.code !== "number" ||
      !("stdout" in err) || !Buffer.isBuffer(err.stdout) ||
      !("stderr" in err) || !Buffer.isBuffer(err.stderr)
    ) {
      throw err;
    }
    return { stdout: err.stdout, stderr: err.stderr, exitCode: err.code };
  }
}

async function compileAndCompare(name: string, source: string, backend?: "c"): Promise<void> {
  const key = createHash("sha256")
    .update(source)
    .update(backend ?? "default")
    .update(sanitize ? "san" : "plain")
    .digest("hex")
    .slice(0, 16);
  const outDir = join(cacheDir, `error-cause-${key}`);
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${name}.ts`);
  writeFileSync(file, source);
  const result = await compile(file, {
    outPath: join(outDir, "program"),
    outDir,
    sanitize,
    dynamic: true,
    ...(backend ? { backend } : {}),
  });
  if (!result.ok) {
    throw new Error(
      "Error cause program failed to compile:\n" +
        result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"),
    );
  }
  const [nodeResult, nativeResult] = await Promise.all([
    run("node", [file]),
    run(result.binaryPath, []),
  ]);
  expect(nativeResult.stdout).toEqual(nodeResult.stdout);
  expect(nativeResult.stderr).toEqual(nodeResult.stderr);
  expect(nativeResult.exitCode).toBe(nodeResult.exitCode);
}

const source = `const reason = { code: 7, text: "root" };
const absent = new Error("absent");
const plain = new Error("plain", { cause: reason });
const typed = new TypeError("typed", { cause: undefined });
const ranged = new RangeError("range", { cause: null });
const syntax = new SyntaxError("syntax", { cause: "bad token" });
console.log("cause" in absent, absent.cause === undefined);
console.log("cause" in plain, (plain.cause as { code: number }).code, plain.message);
console.log("cause" in typed, typed.cause === undefined, typed.name);
console.log(ranged.cause === null, syntax.cause, ranged instanceof Error);
`;

describe(`Error cause options${sanitize ? " (sanitized)" : ""}`, () => {
  test("matches Node through the C backend", async () => {
    await compileAndCompare("c-backend", source, "c");
  });

  test("matches Node through the default backend", async () => {
    await compileAndCompare("default-backend", source);
  });
});
