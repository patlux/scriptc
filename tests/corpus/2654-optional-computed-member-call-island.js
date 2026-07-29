// @dynamic
// Engine/jsval fallback for optional computed member calls. JSON.parse
// creates the engine object; assigning a compiled closure crosses it into
// the engine. The optional call must retain the member reference and bind
// the real engine receiver, while nullish members keep arguments lazy.
let calls = "";
const engine = JSON.parse('{"marker":"E","missing":null}');
engine.run = function () {
  calls += "call|";
  return this.marker;
};
engine.fail = function () {
  calls += "fail|";
  throw new Error("callee boom");
};
/** @type {any} */
const bag = { engine };
let args = 0;
function arg() {
  args++;
  return "x";
}
console.log(`${bag.engine["run"]?.(arg())}`);
console.log(calls, args);
console.log(bag.engine["missing"]?.(arg()) === undefined);
console.log(calls, args);
try {
  bag.engine["fail"]?.();
} catch (e) {
  console.log("callee:", String(e));
}
console.log(calls, args);
