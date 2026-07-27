import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { expect, test } from "vitest";
import { DARWIN_COMMAND_LINE_TOOLS_BIN, resolveNativeTestPath } from "./native-test-toolchain.js";

const inheritedPath = ["/nix/store/clang-wrapper/bin", "/usr/bin", "/bin"].join(delimiter);

test("Darwin native tests prefer an available Command Line Tools clang", () => {
  expect(resolveNativeTestPath("darwin", inheritedPath, () => true)).toBe(
    [DARWIN_COMMAND_LINE_TOOLS_BIN, "/nix/store/clang-wrapper/bin", "/usr/bin", "/bin"].join(delimiter),
  );
});

test("native test PATH stays unchanged off Darwin or without Command Line Tools", () => {
  expect(resolveNativeTestPath("linux", inheritedPath, () => true)).toBe(inheritedPath);
  expect(resolveNativeTestPath("darwin", inheritedPath, () => false)).toBe(inheritedPath);
});

test("Darwin native test PATH does not duplicate Command Line Tools", () => {
  const currentPath = ["/usr/bin", DARWIN_COMMAND_LINE_TOOLS_BIN, "/bin"].join(delimiter);
  expect(resolveNativeTestPath("darwin", currentPath, () => true)).toBe(
    [DARWIN_COMMAND_LINE_TOOLS_BIN, "/usr/bin", "/bin"].join(delimiter),
  );
});

test.skipIf(
  process.platform !== "darwin" || !existsSync(join(DARWIN_COMMAND_LINE_TOOLS_BIN, "clang")),
)("Vitest children use the Command Line Tools sanitizer runtime", () => {
  const resourceDir = execFileSync("clang", ["--print-resource-dir"], { encoding: "utf8" }).trim();
  expect(resourceDir.startsWith(DARWIN_COMMAND_LINE_TOOLS_BIN.slice(0, -4))).toBe(true);
});
