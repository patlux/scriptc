// Concrete program-class methods as values: each property read mints a fresh
// receiver-retaining closure; storing one read reuses that identity. Detached
// invocation keeps this, override dispatch follows the dynamic class, and
// call/apply/bind preserve the already-bound receiver.
class Counter {
  protected value: number;
  readonly saved: (delta: number) => number = this.add;

  constructor(value: number) {
    this.value = value;
  }

  add(delta: number): number {
    this.value += delta;
    return this.value;
  }

  async later(delta: number): Promise<number> {
    return this.add(delta);
  }

  *steps(count: number): Generator<number, number, undefined> {
    for (let i = 0; i < count; i++) yield this.add(1);
    return this.value;
  }
}

class DoubleCounter extends Counter {
  add(delta: number): number {
    return super.add(delta * 2);
  }
}

const first = new Counter(1);
const second = new DoubleCounter(10);
const freshA = first.add;
const freshB = first.add;
const savedFirst = first.saved;
const savedFirstAgain = first.saved;
const savedSecond = second.saved;
console.log(savedFirst === savedFirstAgain, freshA === freshA, freshB === freshB);
console.log(freshA.call(first, 2), savedSecond.call(second, 2));
console.log(savedFirst.call(first, 1), savedSecond.apply(second, [1]));
const rebound = savedSecond.bind(second);
console.log(rebound === savedSecond, rebound(1));
async function finish(): Promise<void> {
  const later = second.later;
  console.log(await later.call(second, 1));
  const gen = second.steps;
  const it = gen.call(second, 2);
  console.log(it.next().value, it.next().value, it.next().value);
}
finish();
