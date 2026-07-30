// @dynamic
// @ts-check
// Result Error residual: `parsed.error.message` nested in a dyn
// object-literal argument. This differential pin owns the JavaScript /
// dyn-object shape; the npm-static fixture forces the receiver VALUE into
// the engine-handle (jsval) representation that crashed package coverage.

/**
 * @template TValue
 * @template TError
 * @typedef {{ ok: true, value: TValue } | { ok: false, error: TError }} Result
 */

/**
 * @param {string} message
 * @returns {Error}
 */
function makeErr(message) {
  const e = new Error(message);
  e.name = "FrontmatterError";
  return e;
}

/**
 * @param {string} content
 * @returns {Result<{body: string}, Error>}
 */
function parseFrontmatter(content) {
  if (content.includes("bad")) {
    return { ok: false, error: makeErr("boom") };
  }
  return { ok: true, value: { body: content } };
}

/** @type {{ type: string, code: string, message: string, path: string }[]} */
const diagnostics = [];
const rawContent = { value: "bad" };
const parsed = parseFrontmatter(rawContent.value);
if (!parsed.ok) {
  diagnostics.push({
    type: "warning",
    code: "parse_failed",
    message: parsed.error.message,
    path: "/tmp/x.md",
  });
}

// Dyn object-literal argument built from the same residual.
const bag = JSON.parse('{"items":[]}');
if (!parsed.ok) {
  bag.items.push({
    type: "warning",
    code: "parse_failed",
    message: parsed.error.message,
    path: "/tmp/x.md",
  });
}

console.log(diagnostics[0].message);
console.log(bag.items[0].message);
console.log(diagnostics[0].code, bag.items[0].type);
