// @dynamic
// The checked-dynamic function boundary, OUT direction over checker-`any`
// signatures: `(this && this.rewrite) || function (a, b) { ... }` is the
// tslib-style default — left arm is unknown, right is a typed/any-param
// function, and the slot expects `(any, any) => any`. A dyn value adapts
// into that target through the per-signature shim (params enter dyn via
// scr_dyn_from_jsval; the result exits via scr_jsval_from_dyn). Node is
// the oracle byte-for-byte.
"use strict";

var rewrite =
  (this && this.rewrite) ||
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

console.log(typeof rewrite);
console.log(`${rewrite("node:fs/promises")}`);
console.log(`${rewrite("./mod.ts")}`);
console.log(`${rewrite("./mod.tsx")}`);
console.log(`${rewrite("./mod.cts")}`);
console.log(`${rewrite("/abs/file.ts")}`);

// typeof-function narrow of an unknown into a callback slot.
function take(fn) {
  if (typeof fn !== "function") throw new TypeError("not a function");
  return fn("a", "b");
}
function pair(a, b) {
  return a + "," + b;
}
const u = pair;
console.log(`${take(typeof u === "function" ? u : null)}`);

// Union function | undefined default.
function run(cb) {
  const f =
    cb ||
    function (x) {
      return "d:" + x;
    };
  return f("z");
}
console.log(`${run(undefined)}`);
console.log(
  `${run(function (x) {
    return "c:" + x;
  })}`,
);
