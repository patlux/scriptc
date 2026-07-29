// Plain assignment through property/element references: reference components
// evaluate before RHS, each once; the write preserves setters/storage and the
// expression yields the assigned value.

interface Box {
  value: string;
  [key: string]: string;
}

let receiverCalls = 0;
let keyCalls = 0;
let rhsCalls = 0;
const order: string[] = [];
const box: Box = { value: "old" };

function receiver(): Box {
  receiverCalls++;
  order.push("receiver");
  return box;
}
function key(): "value" {
  keyCalls++;
  order.push("key");
  return "value";
}
function rhs(value: string): string {
  rhsCalls++;
  order.push("rhs");
  return value;
}

receiver()[key()] = rhs("computed");
console.log(box.value, receiverCalls, keyCalls, rhsCalls, order.join(","));

const order2: string[] = [];
function receiver2(): Box {
  receiverCalls++;
  order2.push("receiver");
  return box;
}
function rhs2(value: string): string {
  rhsCalls++;
  order2.push("rhs");
  return value;
}
const result = (receiver2().value = rhs2("dot-result"));
console.log(result, box.value, receiverCalls, rhsCalls, order2.join(","));

const chained: Box = { value: "a" };
let local = "";
local = chained.value = "chain";
console.log(local, chained.value);

class Holder {
  field = "start";
}
const holder = new Holder();
console.log((holder.field = "class"), holder.field);

const pure: Record<string, number> = {};
let pureKey = "n";
console.log((pure[pureKey] = 42), pure[pureKey]);

let setterValue = "";
let setterCalls = 0;
const accessor = {
  get value(): string {
    return setterValue;
  },
  set value(next: string) {
    setterCalls++;
    setterValue = next;
  },
};
console.log((accessor.value = "setter"), accessor.value, setterCalls);

const unknownDot = JSON.parse('{"x":1}');
const unknownComputed = JSON.parse('{}');
console.log((unknownDot.x = 7), JSON.stringify(unknownDot));
console.log((unknownComputed["k"] = "v"), JSON.stringify(unknownComputed));

const envOrder: string[] = [];
function envKey(): string {
  envOrder.push("key");
  return "SCRIPTC_ASSIGN_EXPR";
}
function envValue(): string {
  envOrder.push("rhs");
  return "env-result";
}
console.log((process.env[envKey()] = envValue()), process.env["SCRIPTC_ASSIGN_EXPR"], envOrder.join(","));

const url = new URL("https://example.com/a/b?q=1#f");
console.log((url.protocol = "ftp"), url.protocol, url.href);
console.log((url.pathname = "/next path/../done"), url.pathname, url.href);
url.protocol = "non-special";
console.log(url.protocol, url.href);
url.protocol = "h\nttp:ignored";
console.log(url.protocol, url.href);

const argv1 = process.argv[1];
process.title = "scriptc-assignment-title";
console.log(process.title, process.argv[1] === argv1);
