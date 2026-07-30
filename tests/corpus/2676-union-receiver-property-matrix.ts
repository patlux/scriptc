// @transform-types
// Union receiver property reads: concrete class residual, shared record
// fields, empty-record residual, and Result-style Error.message inside a
// dyn object-literal argument. Pins object / record / empty-layout paths;
// the npm-static union-receiver fixture owns the exact island/jsval twin.
//
// @ts-nocheck — residual product shapes use empty layouts and Error arms
// that tsc would narrow away; coverage inventories the same shapes.

class A {
  value = "A";
  tag = "a";
}
class B {
  value = "B";
  tag = "b";
}
type Item = A | B;
const concrete = new A();

type Ok = { kind: "ok"; value: string };
type Err = { kind: "err"; value: string };
type Result = Ok | Err;
let r: Result = { kind: "ok", value: "hi" };

// Empty residual as a pure local: every name is an own-property miss.
const empty = {};
type Theme = {} | { color: string };
let theme: Theme = {};

// Generic instantiation that preserves a concrete class residual.
function id<T>(x: T): T {
  return x;
}
const g: Item = id(concrete as Item);

// Dyn object-literal argument built from union-typed receivers.
const bag = JSON.parse('{"items":[]}');
bag.items.push({
  classValue: (concrete as Item).value,
  classTag: (concrete as Item).tag,
  resultKind: r.kind,
  resultValue: r.value,
  genericValue: g.value,
  emptyMiss: (empty as { color?: string }).color === undefined ? "u" : "has",
  themeMiss: (theme as { color?: string }).color === undefined ? "u" : "has",
});

// Direct residual reads (no dyn marshalling).
console.log((concrete as Item).value);
console.log((concrete as Item)?.value);
console.log(r.kind, r.value);
console.log(g.value);
console.log((empty as { color?: string }).color === undefined ? "u" : "has");

// Re-arm the result and the theme, then re-push.
r = { kind: "err", value: "nope" };
theme = { color: "red" };
bag.items.push({
  direct: (concrete as Item).value,
  optional: (concrete as Item)?.value,
  result: r.value,
  themeColor: (theme as { color?: string }).color === undefined ? "u" : (theme as { color: string }).color,
});

// Static Result-style Error arm twin, nested in a dyn object-literal
// argument. The npm-static fixture drives the engine-handle representation
// of the same agent-core prompt-templates shape.
class FrontmatterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrontmatterError";
  }
}
type ParseOk = { ok: true; value: { body: string } };
type ParseErr = { ok: false; error: FrontmatterError };
type ParseResult = ParseOk | ParseErr;

function parseFrontmatter(raw: string): ParseResult {
  if (raw.includes("bad")) {
    return { ok: false, error: new FrontmatterError("boom") };
  }
  return { ok: true, value: { body: raw } };
}

const diagnostics: { type: string; code: string; message: string; path: string }[] = [];
const parsed = parseFrontmatter("bad");
if (!parsed.ok) {
  diagnostics.push({
    type: "warning",
    code: "parse_failed",
    message: parsed.error.message,
    path: "/tmp/x.md",
  });
  bag.items.push({ message: parsed.error.message });
}

console.log(bag.items[0].classValue, bag.items[0].resultKind, bag.items[0].emptyMiss);
console.log(bag.items[1].direct, bag.items[1].result, bag.items[1].themeColor);
console.log(diagnostics[0]!.message, bag.items[2].message);
