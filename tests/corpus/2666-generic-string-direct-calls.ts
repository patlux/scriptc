// Generic/ternary/logical direct string calls must stay method calls, not
// property-method values. Receivers evaluate once; string arguments keep
// ordinary string arguments and UTF-16 index semantics.
let receiverCalls = 0;
function receiver(value: string): string {
  receiverCalls += 1;
  return value;
}

function classify<T extends string>(value: T, slash: boolean, needle: string): string {
  const direct = !value.includes("/") && !value.includes("\\");
  const ternary = slash ? value.includes("/") : value.includes("\\");
  const logical = slash && value.includes("/");
  const coerced = value.includes(needle);
  return `${direct}|${ternary}|${logical}|${coerced}`;
}

console.log(classify("scriptc7", false, "7"));
console.log(classify("dir/scriptc", true, "script"));
console.log(receiver("A😀B").includes("B", 2), receiverCalls);
console.log(receiver("A😀B").includes("😀", 1), receiverCalls);

// The stale-any direct-call recovery must not preempt specialized calls on
// ordinary typed arrays. In particular, filter(Boolean) owns the callback as
// the ambient truthiness constructor; generic HOF lowering must not try to
// compile BooleanConstructor as an ordinary generic function value.
const tokens = " alpha  beta ".split(/\s+/).filter(Boolean);
console.log(tokens.join(","));
