// Optional computed member calls on checked-dynamic values: the TypeBox
// Match arity-table shape plus the JS reference semantics that distinguish
// `obj[key]?.(...args)` from extracting and calling an unbound function.
/** @type {unknown} */
const match = {
  marker: "bound",
  0: function () { return this.marker; },
  1: function () { return this.marker; },
  2: null,
  3: undefined,
};

function run(...args) {
  return match[args.length]?.(...args);
}

console.log(`${run()}`);
console.log(`${run("x")}`);
console.log(run("x", "y") === undefined);
console.log(run("x", "y", "z") === undefined);
console.log(run("x", "y", "z", "q") === undefined);

// Receiver and key are each evaluated once. The property GET happens
// before arguments; arguments stay lazy when the member is nullish.
let objReads = 0;
let keyReads = 0;
let argReads = 0;
function receiver() {
  objReads++;
  return match;
}
function key(n) {
  keyReads++;
  return n;
}
function arg(s) {
  argReads++;
  return s;
}
console.log(`${receiver()[key(1)]?.(arg("A"))}`);
console.log(objReads, keyReads, argReads);
console.log(receiver()[key(2)]?.(arg("B")) === undefined);
console.log(objReads, keyReads, argReads);

// A taken callee throw propagates; a missing member remains undefined.
const throws = {
  fail: function () { throw new Error("callee boom"); },
};
try {
  throws["fail"]?.();
} catch (e) {
  console.log("callee:", String(e));
}
console.log(throws["missing"]?.() === undefined);
