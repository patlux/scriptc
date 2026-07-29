// Generic delete lowering: pure Record keys, process.env cleanup, and
// checked-dynamic plain objects. Receiver/key evaluate once (key first),
// the expression yields a boolean, missing keys are true no-ops, present
// undefined is real absence after delete, survivors keep insertion order,
// env unsets are visible to later reads, and nested values release.
const bag: Record<string, string> = {
  a: "1",
  b: "2",
  c: "3",
};
const key = "b";
console.log("record-delete-result", delete bag[key]);
console.log("record-keys", Object.keys(bag).join(","));
console.log("record-has-b", Object.keys(bag).includes("b"), Object.keys(bag).includes("a"));
console.log("record-json", JSON.stringify(bag));
console.log("record-delete-absent", delete bag["missing"]);
console.log("record-keys-final", Object.keys(bag).join(","));

// Key side effects evaluate once, before the receiver write is observed.
let steps = 0;
const sideKey = (): string => {
  steps += 1;
  return "c";
};
const sideBag: Record<string, number> = { c: 9, d: 10 };
console.log("side-result", delete sideBag[sideKey()]);
console.log("side-steps", steps);
console.log("side-keys", Object.keys(sideBag).join(","));

// Nested refcounted value: delete releases the owned string.
const nested: Record<string, { v: string }> = {
  keep: { v: "alive" },
  drop: { v: "gone" },
};
console.log("nested-delete", delete nested["drop"]);
console.log("nested-keys", Object.keys(nested).join(","));
console.log("nested-keep", nested["keep"]!.v);

// process.env cleanup (harness pins SCRIPTC_TEST_ENV; use unique names).
const ENV_KEY = "SCRIPTC_DEL_DYNAMIC_A";
process.env[ENV_KEY] = "present";
console.log("env-before", process.env[ENV_KEY], process.env[ENV_KEY] !== undefined);
console.log("env-delete-result", delete process.env[ENV_KEY]);
console.log("env-after", process.env[ENV_KEY] === undefined, process.env[ENV_KEY] !== undefined);
console.log("env-delete-absent", delete process.env["SCRIPTC_DEL_DYNAMIC_NEVER"]);
console.log("env-absent-still", process.env["SCRIPTC_DEL_DYNAMIC_NEVER"] === undefined);

// Checked-dynamic plain objects (the any/unknown receiver product shape):
// legacy session field cleanup, survivor order, expression result.
function scrub(session: any, field: string): boolean {
  return delete session[field];
}
const session: any = { id: "s1", parentId: "root", firstKeptEntryIndex: 2, note: "legacy" };
console.log("dyn-delete-index", scrub(session, "firstKeptEntryIndex"));
console.log("dyn-keys", Object.keys(session).join(","));
console.log("dyn-has-index", Object.hasOwn(session, "firstKeptEntryIndex"));
console.log("dyn-json", JSON.stringify(session));

// transformMessages-style copied field cleanup on a checked-dynamic value.
function scrubThought(toolCall: any): any {
  delete toolCall.thoughtSignature;
  delete toolCall.partialJson;
  return toolCall;
}
const transformed: any = {
  id: "tc1",
  name: "run",
  thoughtSignature: "sig",
  partialJson: "{",
  args: { x: 1 },
};
scrubThought(transformed);
console.log("transform-keys", Object.keys(transformed).join(","));
console.log("transform-json", JSON.stringify(transformed));
console.log("copy-delete-name", delete transformed.name);
console.log("copy-keys", Object.keys(transformed).join(","));
console.log("copy-has-name", Object.hasOwn(transformed, "name"));

// Present undefined is actual absence after delete on a checked-dynamic bag.
const dynBag: any = { keep: 1, gone: undefined, later: 3 };
console.log("dyn-undef-before", Object.hasOwn(dynBag, "gone"), "gone" in dynBag);
console.log("dyn-undef-delete", delete dynBag.gone);
console.log("dyn-undef-after", Object.hasOwn(dynBag, "gone"), "gone" in dynBag, Object.keys(dynBag).join(","));
