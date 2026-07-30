interface UnsupportedBufferConstructor {
  readonly poolSize: number;
  new(size: number): Buffer;
}

const ctor = Buffer as typeof Buffer & UnsupportedBufferConstructor;
console.log(ctor.poolSize); // unsupported Buffer static still fails closed
new ctor(4); // constructor call-through remains unsupported
// Keep a real trailing frame line instead of the synthetic EOF line.
