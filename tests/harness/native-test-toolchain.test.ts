import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { expect, test } from "vitest";
import {
  DARWIN_COMMAND_LINE_TOOLS_BIN,
  createNativeTestCompilerShim,
  resolveNativeTestPath,
} from "./native-test-toolchain.js";

const inheritedPath = ["/nix/store/clang-wrapper/bin", "/usr/bin", "/bin"].join(delimiter);

test("Darwin native tests prepend only the compiler shim", () => {
  expect(resolveNativeTestPath("darwin", inheritedPath, "/tmp/scriptc-compiler-shim")).toBe(
    ["/tmp/scriptc-compiler-shim", "/nix/store/clang-wrapper/bin", "/usr/bin", "/bin"].join(delimiter),
  );
});

test("native test PATH stays unchanged off Darwin or without a compiler shim", () => {
  expect(resolveNativeTestPath("linux", inheritedPath, "/tmp/scriptc-compiler-shim")).toBe(inheritedPath);
  expect(resolveNativeTestPath("darwin", inheritedPath, undefined)).toBe(inheritedPath);
});

test("Darwin native test PATH removes the complete Command Line Tools bin", () => {
  const currentPath = ["/usr/bin", DARWIN_COMMAND_LINE_TOOLS_BIN, "/bin"].join(delimiter);
  expect(resolveNativeTestPath("darwin", currentPath, "/tmp/scriptc-compiler-shim")).toBe(
    ["/tmp/scriptc-compiler-shim", "/usr/bin", "/bin"].join(delimiter),
  );
});

test("compiler shim requires both Apple compiler drivers", () => {
  expect(createNativeTestCompilerShim("linux", () => true)).toBeUndefined();
  expect(createNativeTestCompilerShim("darwin", (path) => !path.endsWith("clang++"))).toBeUndefined();
});

test.skipIf(
  process.platform !== "darwin" || !existsSync(join(DARWIN_COMMAND_LINE_TOOLS_BIN, "clang")),
)("Vitest children use Apple clang without replacing make", () => {
  const resourceDir = execFileSync("clang", ["--print-resource-dir"], { encoding: "utf8" }).trim();
  expect(resourceDir.startsWith(DARWIN_COMMAND_LINE_TOOLS_BIN.slice(0, -4))).toBe(true);
  expect(execFileSync("sh", ["-c", "command -v make"], { encoding: "utf8" }).trim()).not.toBe(
    join(DARWIN_COMMAND_LINE_TOOLS_BIN, "make"),
  );
});
