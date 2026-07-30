// Static Map iterator projections consumed directly by for-of, spread, and
// Array.from. The runtime walk is live and insertion-ordered: overwrites keep
// position, deletes skip entries, and delete + reinsert appends.
const empty = new Map<string, number>();
console.log("empty", Array.from(empty.keys()).length, Array.from(empty.values()).length, Array.from(empty.entries()).length);

const local = new Map<string, number>();
local.set("a", 1);
local.set("b", 2);
local.set("c", 3);
local.set("b", 20);
console.log("keys", Array.from(local.keys()).join(","));
console.log("values", Array.from(local.values()).join(","));
console.log("spread", [...local.values()].join(","));
for (const [key, value] of Array.from(local.entries())) console.log("entry", key, value);

local.delete("b");
local.set("b", 200);
console.log("reinsert", Array.from(local.keys()).join(","));

// Live mutation: deleting an unvisited entry skips it; appending visits it.
const live = new Map<string, number>([["first", 1], ["second", 2], ["third", 3]]);
for (const value of live.values()) {
  console.log("live", value);
  if (value === 1) {
    live.delete("second");
    live.set("fourth", 4);
  }
}

// Early break must close the walk before churn can compact tombstones.
const breakMap = new Map<number, string>();
for (let i = 0; i < 24; i++) breakMap.set(i, `v${i}`);
for (const key of breakMap.keys()) {
  console.log("break", key);
  break;
}
for (let i = 0; i < 20; i++) breakMap.delete(i);
breakMap.set(30, "v30");
console.log("after-break", Array.from(breakMap.keys()).join(","));

// Nested walks keep independent cursors and balanced iteration depth.
const nested = new Map<string, number>([["x", 10], ["y", 20]]);
let pairs = "";
for (const outer of nested.keys()) {
  for (const inner of nested.values()) pairs += `${outer}${inner}|`;
}
console.log("nested", pairs);

// Generic Map specialization must preserve get() as V | undefined.
function typedGet<K extends string, V>(map: Map<K, V>, key: K): V | undefined {
  return map.get(key);
}
const found = typedGet(local, "a");
const missing = typedGet(local, "missing");
if (found !== undefined) console.log("narrow", found + 10);
console.log("missing", missing === undefined);
