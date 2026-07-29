// @dynamic
// The module-level rewritten dynamic-import helper — the pi-ai
// auth/context shape: `(specifier) => import(rewrite(specifier))`. The
// rewrite arm is the tslib extension rewrite (function-replacement regex);
// the import arm is a COMPUTED specifier through island.importDyn. Builtins
// resolve against the island shim table; an unresolvable key rejects
// catchably (lazy-trap honesty — never invents a module). Node is the
// oracle.
"use strict";

var __rewriteRelativeImportExtension =
  (this && this.__rewriteRelativeImportExtension) ||
  function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
      return path.replace(
        /\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i,
        function (m, tsx, d, ext, cm) {
          return tsx
            ? preserveJsx
              ? ".jsx"
              : ".js"
            : d && (!ext || !cm)
              ? m
              : d + ext + "." + cm.toLowerCase() + "js";
        },
      );
    }
    return path;
  };

const importNodeModule = (specifier) =>
  import(__rewriteRelativeImportExtension(specifier));

async function main() {
  const fs = await importNodeModule("node:fs/promises");
  console.log(`${typeof fs.access} ${typeof fs.readFile}`);

  // Catchable unsupported edge: a key the embedded graph never saw.
  try {
    await importNodeModule("scriptc-missing-package-xyz");
    console.log("unreachable");
  } catch (e) {
    console.log("caught", e instanceof Error ? "err" : "other");
  }
}

main();
