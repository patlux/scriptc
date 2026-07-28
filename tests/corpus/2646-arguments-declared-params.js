// Declared-parameter JavaScript functions capture every actual call argument
// in their body-owned `arguments` object. Direct calls and function-value /
// checked-dynamic boundaries must pack from index 0, not params.length.
function inspect(first, second) {
  console.log(
    "inspect",
    first,
    second,
    arguments.length,
    arguments[0],
    arguments[1],
    arguments[2],
    arguments[3],
  );
}

inspect("a", "b", "c", "d");
inspect("x");

const asValue = inspect;
asValue("v0", "v1", "v2");

const throughDyn = /** @type {*} */ (inspect);
throughDyn("d0", "d1", "d2", "d3");

function firstAndBeyond(head) {
  return arguments[0] + ":" + arguments[2] + ":" + arguments.length;
}
console.log(firstAndBeyond("head", "middle", "tail"));
