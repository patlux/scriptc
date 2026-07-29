// Object.keys/values/entries across the static object families: record
// own-key order, optional omission, spreads/callback pipelines, class own
// fields only, dense arrays, and Map internal-slot emptiness.

const ordered = { tail: "t", "10": "ten", "2": "two", head: "h" };
console.log(Object.keys(ordered).join(","));
console.log(Object.values(ordered).join(","));
console.log(Object.entries(ordered).map(([k, v]) => `${k}:${v}`).join("|"));

interface MaybeRow {
  required: string;
  optional?: number;
}
const absent: MaybeRow = { required: "yes" };
const present: MaybeRow = { required: "yes", optional: 4 };
console.log(Object.keys(absent).join(","), Object.values(absent).length);
console.log(Object.entries(present).map(([k, v]) => `${k}:${String(v)}`).join("|"));

const left = { alpha: { display: "Alpha", enabled: true } };
const right = { beta: { display: "Beta", enabled: false } };
const providers = { ...left, ...right };
const displays = Object.values(providers).map((provider) => provider.display).join(",");
const enabled = Object.values(providers)
  .filter((provider) => provider.enabled)
  .map((provider) => provider.display)
  .join("|");
console.log(displays, enabled);

class BaseRow {
  base = 1;
  inherited(): number { return 7; }
}
class OwnRow extends BaseRow {
  label = "own";
  optional?: number;
  initializerless: number | undefined;
  #secret = 99;
  declare erased: string;
}
const row = new OwnRow();
console.log(Object.keys(row).join(","));
const rowValues = Object.values(row);
console.log(rowValues.length);
const rowEntries = Object.entries(row);
console.log(rowEntries.length, rowEntries[0]![0], rowEntries[1]![0], rowEntries[2]![0], rowEntries[3]![0]);

const nums = [3, 4, 5];
console.log(Object.keys(nums).join(","));
console.log(Object.values(nums).reduce((sum, value) => sum + value, 0));
console.log(Object.entries(nums).map(([k, v]) => `${k}:${v}`).join("|"));

const map = new Map<string, number>([["x", 1], ["y", 2]]);
console.log(Object.keys(map).length, Object.values(map).length, Object.entries(map).length);
const set = new Set<string>(["x", "y"]);
console.log(Object.keys(set).length, Object.values(set).length, Object.entries(set).length);
