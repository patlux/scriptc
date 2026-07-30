const b = Buffer.from("x");
const u = new Uint8Array([1]);
console.log(b instanceof Buffer, b instanceof Uint8Array, u instanceof Buffer);
