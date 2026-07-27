import { accessSync, constants } from "node:fs";
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
 * Keep native tests on Darwin paired with the host's current Apple sanitizer
 * runtime. An inherited Nix/Xcode clang can link an older compiler-rt that
 * spins in ASan initialization before main() on a newer macOS host.
 */
export function resolveNativeTestPath(
  platform: NodeJS.Platform,
  currentPath: string | undefined,
  executableProbe: ExecutableProbe = isExecutable,
): string | undefined {
  if (platform !== "darwin" || !executableProbe(join(DARWIN_COMMAND_LINE_TOOLS_BIN, "clang"))) {
    return currentPath;
  }

  const entries = (currentPath ?? "")
    .split(delimiter)
    .filter((entry) => entry !== "" && entry !== DARWIN_COMMAND_LINE_TOOLS_BIN);
  return [DARWIN_COMMAND_LINE_TOOLS_BIN, ...entries].join(delimiter);
}
