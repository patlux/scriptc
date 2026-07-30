import { createHash } from "node:crypto";
import { dirname, relative } from "node:path";
import { npmStaticPackageOfPath } from "./frontend/npm-static.js";
import { npmPackageRelativePathOf } from "./frontend/shared.js";
import type { IrModule, SrcLoc } from "./ir/nodes.js";

export interface RuntimeTraceModule {
  sourceFile: string;
  identity: string;
}

export interface RuntimeTraceMetadata {
  npmStaticPackages: readonly string[];
  modules: readonly RuntimeTraceModule[];
  extensions: readonly string[];
}

export interface RuntimeTraceOptionError {
  message: string;
  loc: SrcLoc;
}

const EXTENSION_ID = /^[A-Za-z0-9][A-Za-z0-9._:@/+~-]{0,127}$/;

/** Validate the explicit semantic extension-id channel. These strings are
 * compiler metadata, not runtime assertions: accepted ids are sorted and
 * embedded into the emitted native TU. */
export function validateRuntimeTraceExtensions(
  entryPath: string,
  dynamic: boolean,
  requested: readonly string[] | undefined,
): { extensions: readonly string[] } | RuntimeTraceOptionError {
  if (requested === undefined || requested.length === 0) return { extensions: [] };
  const loc = { file: entryPath, start: 0, end: 0 };
  if (!dynamic) {
    return {
      message: "runtime trace extension identities require a --dynamic build (static executables do not contain the runtime tracer)",
      loc,
    };
  }
  const seen = new Set<string>();
  for (const id of requested) {
    if (!EXTENSION_ID.test(id) || id.includes("..") || id.includes("//")) {
      return {
        message: `unsafe runtime trace extension identity '${id}' (use 1-128 ASCII letters, digits, '.', '_', ':', '@', '/', '+', '~', or '-', with no '..' or '//')`,
        loc,
      };
    }
    if (seen.has(id)) {
      return { message: `duplicate runtime trace extension identity '${id}'`, loc };
    }
    seen.add(id);
  }
  return { extensions: [...seen].sort() };
}

function localModuleIdentity(entryPath: string, sourceFile: string, sourceText: string): string {
  // The absolute build/staging root never enters the artifact. The digest
  // commits to the module's relocation-safe path relative to the entry and
  // its exact source bytes; moving the whole tree preserves the identity,
  // while either a path or content change produces a new identity.
  const rel = relative(dirname(entryPath), sourceFile).split("\\").join("/");
  const digest = createHash("sha256")
    .update("scriptc-runtime-trace-local-v1\0")
    .update(rel)
    .update("\0")
    .update(sourceText)
    .digest("hex");
  return `local:sha256:${digest}`;
}

/** Build schema-v2 inventory solely from compiler-owned graph facts. Module
 * order is canonical identity order, independent of discovery/evaluation
 * order; the sourceFile remains compiler-private and is used only to place
 * module-init instrumentation. */
export function buildRuntimeTraceMetadata(
  mod: IrModule,
  entryPath: string,
  sourceTexts: ReadonlyMap<string, string>,
  npmStaticPackages: readonly string[],
  extensions: readonly string[],
): RuntimeTraceMetadata {
  const bySource = new Map<string, RuntimeTraceModule>();
  for (const fn of mod.functions) {
    if (!fn.name.startsWith("%init.")) continue;
    const sourceFile = fn.loc.file;
    if (bySource.has(sourceFile)) continue;
    const pkg = npmStaticPackageOfPath(sourceFile);
    let identity: string;
    if (pkg !== null) {
      const packageRelative = npmPackageRelativePathOf(sourceFile, pkg);
      if (packageRelative === null) {
        throw new Error(`runtime trace could not canonicalize npm-static module '${sourceFile}'`);
      }
      identity = `npm:${pkg}:${packageRelative}`;
    } else {
      const sourceText = sourceTexts.get(sourceFile);
      if (sourceText === undefined) {
        throw new Error(`runtime trace has no compiler source text for module '${sourceFile}'`);
      }
      identity = localModuleIdentity(entryPath, sourceFile, sourceText);
    }
    bySource.set(sourceFile, { sourceFile, identity });
  }
  const modules = [...bySource.values()].sort((a, b) => a.identity.localeCompare(b.identity));
  for (let i = 1; i < modules.length; i++) {
    if (modules[i - 1]!.identity === modules[i]!.identity) {
      throw new Error(`runtime trace canonical module identity collision '${modules[i]!.identity}'`);
    }
  }
  return {
    npmStaticPackages: [...npmStaticPackages].sort(),
    modules,
    extensions: [...extensions],
  };
}
