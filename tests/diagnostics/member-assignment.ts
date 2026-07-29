// Storage semantics not modeled by the generic reference lowering fail
// closed. Array length writes resize/truncate and need a dedicated primitive.

const values = [1, 2, 3];
const result = (values.length = 1);
console.log(result);
