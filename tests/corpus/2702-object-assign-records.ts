// Object.assign over statically representable plain records: every source
// expression evaluates before mutation begins, then own fields copy in
// source order, later sources win, and the returned value is the target.
// Optional record sources without a statically-known own-key set stay
// fenced: absent and own-present undefined share one record union state.
const events: string[] = [];
function seen<T>(label: string, value: T): T {
  events.push(label);
  return value;
}

const target = {
  name: "base",
  enabled: false,
  nested: { label: "old" },
  items: ["old"],
};
const oldNested = target.nested;
const oldItems = target.items;
const result = Object.assign(
  seen("target", target),
  seen("source-1", { name: "one" }),
  null,
  seen("source-2", { enabled: true, nested: { label: "new" } }),
  undefined,
  seen("source-3", { name: "final", items: ["new", "tail"] }),
) as typeof target;
console.log(events.join(","));
console.log(result === target, target.name, target.enabled, target.nested.label, target.items.join("|"));
console.log(oldNested.label, oldItems.join("|"));

// An own-present undefined literal overwrites exactly; a missing field in
// a simple literal is absent and leaves the target slot unchanged.
const optional: { value: string | undefined; keep: number } = { value: "set", keep: 7 };
Object.assign(optional, { value: undefined });
console.log(optional.value, optional.keep);
Object.assign(optional, {});
console.log(optional.value, optional.keep);

// Source expressions complete before the first write. A later throw leaves
// the target untouched even though earlier source literals were evaluated.
const guarded = { left: 0, right: 0 };
function failSource(): { right: number } {
  events.push("throw-source");
  throw new Error("assign boom");
}
try {
  Object.assign(guarded, seen("early-source", { left: 1 }), failSource());
} catch (error) {
  if (error instanceof Error) console.log("caught:", error.message);
}
console.log(guarded.left, guarded.right, events.slice(-2).join(","));

// Width/refinement: narrower source fields enter wider target slots; nested
// refcounted values overwrite and remain live through the returned target.
const widened: { mode: string | number; meta: { text: string } } = {
  mode: 1,
  meta: { text: "before" },
};
const widenedResult = Object.assign(
  widened,
  { mode: "ready" },
  { meta: { text: "after" } },
) as typeof widened;
console.log(widenedResult === widened, widened.mode, widened.meta.text);
console.log("done");
