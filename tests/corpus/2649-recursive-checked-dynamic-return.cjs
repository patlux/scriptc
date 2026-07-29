// npm-static-style implicit-any recursion starts with a checked-dynamic
// result ABI. Same-key recursion must keep every call/result DYN even when
// the eventual leaf return is a statically representable record.
function peel(value) {
  if (value.length === 0) return { done: true };
  return peel(value.slice(1));
}
const peeled = peel("abc");
console.log(peeled.done, typeof peeled);
