import { accessSync, constants, mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

export const DARWIN_COMMAND_LINE_TOOLS_BIN = "/Library/Developer/CommandLineTools/usr/bin";

type ExecutableProbe = (path: string) => boolean;

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Expose only the current Apple compilers. Prepending the complete Command
 * Line Tools bin directory would also replace make/ar and can break an
 * otherwise coherent Nix build environment.
 */
export function createNativeTestCompilerShim(
  platform: NodeJS.Platform,
  executableProbe: ExecutableProbe = isExecutable,
): string | undefined {
  const clang = join(DARWIN_COMMAND_LINE_TOOLS_BIN, "clang");
  const clangxx = join(DARWIN_COMMAND_LINE_TOOLS_BIN, "clang++");
  if (platform !== "darwin" || !executableProbe(clang) || !executableProbe(clangxx)) {
    return undefined;
  }

  const shim = mkdtempSync(join(tmpdir(), "scriptc-native-test-toolchain-"));
  symlinkSync(clang, join(shim, "clang"));
  symlinkSync(clangxx, join(shim, "clang++"));
  return shim;
}

/**
 * Keep native tests on Darwin paired with the host's current Apple sanitizer
 * runtime. An inherited Nix/Xcode clang can link an older compiler-rt that
 * spins in ASan initialization before main() on a newer macOS host.
 */
export function resolveNativeTestPath(
  platform: NodeJS.Platform,
  currentPath: string | undefined,
  compilerShim: string | undefined,
): string | undefined {
  if (platform !== "darwin" || compilerShim === undefined) return currentPath;

  const entries = (currentPath ?? "")
    .split(delimiter)
    .filter(
      (entry) =>
        entry !== "" &&
        entry !== compilerShim &&
        entry !== DARWIN_COMMAND_LINE_TOOLS_BIN,
    );
  return [compilerShim, ...entries].join(delimiter);
}
