// node:module — createRequire's LOWERED shape is a const binding over
// createRequire(import.meta.url) (or __filename). Literal and finite
// build-known specifiers resolve per call; a genuinely runtime-computed
// specifier becomes a call-local trap under --dynamic. A base that is not
// "this file" keeps the member fence (the returned require would resolve
// from a directory the compiler is not standing in), and a relative
// non-.json target is a program module — a static import.
import { createRequire } from "node:module";

// The base names some OTHER file: unrecognized — the member fence.
const req = createRequire("/tmp/parent.js");
console.log(String(req("./config.cjs")));

const require = createRequire(import.meta.url);

// Literal concatenation folds to one build-known specifier. Nothing is
// installed at that name, so the call becomes catchable MODULE_NOT_FOUND.
const which = "left" + "-pad";
require(which);

// A relative non-.json target: program modules are static imports.
require("./helper.js");
// Keep this as the final pointed fence in the diagnostic program.
