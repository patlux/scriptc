// Function and record elements need the physical T|undefined shift result:
// truthiness narrows it, then the surviving arm is callable/field-readable.
type Waiter = (value: { value: string | undefined; done: boolean }) => void;

const waiting: Waiter[] = [];
waiting.push((result) => console.log(`${result.done}:${result.value ?? "end"}`));
const waiter = waiting.shift();
if (waiter) waiter({ value: "event", done: false });
console.log(waiting.shift() === undefined);

type Pending = {
  settled: boolean;
  resolve: ((value: string | undefined) => void) | undefined;
};

const pending: Pending[] = [{
  settled: false,
  resolve: (value) => console.log(value ?? "missing"),
}];
const query = pending.shift();
if (query && !query.settled) {
  query.settled = true;
  query.resolve?.("rgb");
}
console.log(pending.shift() === undefined);
