// Empty-record residual: own-field reads against values whose proven layout
// is the empty fixed record (`const theme = {}`). The shape carries no
// fields — every name is an own-property miss, so Node answers undefined.
// Absent keys stay absent under `in` / Object.keys; pure receivers fold.

// @ts-nocheck — tsc rejects property access on the empty object type; the
// residual product shape still spells theme.fg / theme.current against an
// empty inferred layout (and coverage inventories that fence).

const theme = {};
console.log(theme.fg === undefined ? "u" : String(theme.fg));
console.log(theme.current === undefined ? "u" : String(theme.current));
console.log("fg" in theme, "current" in theme, "missing" in theme);
console.log(Object.keys(theme).join(",") || "(empty)");

// Pure local alias: still empty.
const alias = theme;
console.log(alias.fg === undefined ? "u" : "has", "fg" in alias);

// Nested empty residual: a field of an outer record is itself empty.
const layout = { theme: {}, current: "dark" as string | undefined };
console.log(
  layout.theme.fg === undefined ? "u" : String(layout.theme.fg),
  layout.current === undefined ? "u" : layout.current,
  "fg" in layout.theme,
  "current" in layout,
);

// Mutation / RC: the empty record is a real heap value; aliasing holds.
const a = {};
const b = a;
console.log(a === b);
// JSON of empty is still empty.
console.log(JSON.stringify(a));

// Base `{}` top-type param (dyn): keys after runtime guard only — no field
// invention. JSON-safe records convert in; class instances stay fenced.
function bag(v: {}): string {
  if (typeof v !== "object" || v === null) return `prim:${typeof v}`;
  return `obj:${Object.keys(v).sort().join(",") || "-"}`;
}
console.log(bag(1));
console.log(bag({ fg: "x", current: "y" }));
console.log(bag({}));

// Generic T extends {} preserves a concrete proven shape through the
// instantiation (return is T, not the empty constraint).
function hold<T extends {}>(v: T): T {
  return v;
}
const held = hold({ fg: "ink", current: "dark" as string | undefined });
console.log(held.fg, held.current === undefined ? "u" : held.current, "fg" in held);

// Startup-options residual after contextual/default-object work: optional
// fields on a defaulted `{}` keep presence distinct from undefined.
type Options = { retryCount?: number; nested?: { label?: string } };
function startup(options: Options = {}): string {
  return `${"retryCount" in options}:${options.retryCount === undefined ? "u" : options.retryCount}:${"nested" in options}`;
}
console.log(startup());
console.log(startup({}));
console.log(startup({ retryCount: undefined }));
console.log(startup({ retryCount: 3, nested: { label: "x" } }));
