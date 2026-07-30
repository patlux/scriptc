// BufferConstructor as a value: pass the exact constructor type through a
// helper, then use the existing static bytes surface. The constructor token
// preserves identity; Buffer.from(bytes) copies, while subarray aliases.
function exercise(Ctor: typeof Buffer, maybe: Buffer | string): void {
  console.log(typeof Ctor, !!Ctor);
  const original = Ctor.from("hé", "utf8");
  const copy = Ctor.from(original);
  copy[0] = 65;
  const alias = original.subarray(0, 1);
  alias[0] = 66;

  const allocated = Ctor.alloc(2);
  allocated[0] = 67;
  const joined = Ctor.concat([original, allocated]);

  console.log(Ctor === Buffer, Ctor.byteLength("hé", "utf8"));
  const plain = new Uint8Array([1]);
  console.log(Ctor.isBuffer(maybe), original instanceof Buffer, original instanceof Uint8Array);
  console.log(plain instanceof Buffer);
  console.log(original.toString("hex"), copy.toString("hex"), joined.toString("hex"));
}

const ctor = Buffer;
const maybe: Buffer | string = Math.random() > -1 ? ctor.from("x") : "x";
exercise(ctor, maybe);
