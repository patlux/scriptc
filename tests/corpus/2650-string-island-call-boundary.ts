// @dynamic
// A statically typed string receiver crossing an engine-backed method
// operation. Generic instantiation preserves STRING on the parameter/local;
// the jsOp callMethod receiver marshals to JSVAL at the operation boundary.
function normalize<T extends string>(value: T): string {
  return value.replace("\r\n", "\n").replace("\r", "\n");
}
console.log(normalize("a\r\nb\rc"));
