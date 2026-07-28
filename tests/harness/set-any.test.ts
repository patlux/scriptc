import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const execFileAsync = promisify(execFile);
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

async function compileAndCompare(source: string): Promise<void> {
  const key = createHash("sha256")
    .update(source)
    .update(sanitize ? "san" : "plain")
    .digest("hex")
    .slice(0, 16);
  const outDir = join(tmpdir(), "scriptc-tests", `set-any-${key}`);
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, "main.mts");
  writeFileSync(file, source);
  const result = await compile(file, {
    outPath: join(outDir, "program"),
    outDir,
    sanitize,
    dynamic: true,
    backend: "c",
  });
  if (!result.ok) {
    throw new Error(
      "Set<any> program failed to compile:\n" +
        result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"),
    );
  }
  const [nodeResult, nativeResult] = await Promise.all([
    run("node", ["--experimental-transform-types", "--disable-warning=ExperimentalWarning", file]),
    run(result.binaryPath, []),
  ]);
  expect(nativeResult.stdout).toEqual(nodeResult.stdout);
  expect(nativeResult.stderr).toEqual(nodeResult.stderr);
  expect(nativeResult.exitCode).toBe(nodeResult.exitCode);
}

describe(`Set<any> island elements${sanitize ? " (sanitized)" : ""}`, () => {
  test("uses SameValueZero for primitives and engine identity for objects", async () => {
    await compileAndCompare(`
const holder: any = { shared: { id: 1 } };
const objectA: any = holder.shared;
const objectB: any = holder.shared;
const equalButDistinct: any = { id: 1 };
const num: any = 4;
const nan: any = Number.NaN;
const minusZero: any = -0;
const plusZero: any = 0;
const text: any = "x";
const set = new Set<any>();

set.add(objectA);
console.log(objectA === objectB, set.has(objectA), set.has(objectB), set.has(equalButDistinct), set.size);
set.add(objectB);
set.add(equalButDistinct);
set.add(num);
set.add(nan);
set.add(minusZero);
set.add(plusZero);
set.add(text);
console.log(set.size, set.has(num), set.has(Number.NaN), set.has(0), set.has(text));
console.log(set.delete(objectB), set.has(objectA), set.size);
console.log(set.delete(equalButDistinct), set.delete(Number.NaN), set.size);
`);
  });
});
