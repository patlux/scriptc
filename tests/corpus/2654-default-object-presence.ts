// Default `{}` options use checked-dynamic storage. That retains the real
// own-key table, so omitted and explicitly-present undefined stay distinct.
type Callback = () => number;
type Options = {
  retryCount?: number;
  nested?: { label?: string };
  callback?: Callback;
};

function callCallback(callback: Callback): number {
  return callback();
}

function exercise(options: Options = {}): void {
  console.log(
    "retryCount" in options,
    options.retryCount === undefined ? "u" : options.retryCount,
    options.retryCount ? "truthy" : "falsy",
  );
  const nested = options.nested;
  const callback = options.callback;
  console.log(
    nested === undefined ? "nested:u" : `nested:${nested.label ?? "u"}`,
    callback === undefined ? "callback:u" : `callback:${callCallback(callback)}`,
  );
  options.nested = { label: "mutated" };
  options.callback = () => 9;
  options.retryCount = 1;
  console.log(options.nested.label, callCallback(options.callback), options.retryCount);
}

exercise();
exercise(undefined);
exercise({ retryCount: undefined });
exercise({ retryCount: 3, nested: {}, callback: () => 4 });

// A nested closure observes both presence and later mutation. Nested records
// and closures pin checked-dynamic RC behavior in the sanitized lanes.
type NestedOptions = { item?: { name: string }; run?: Callback };
function nested(options: NestedOptions = {}): void {
  const read = (): string => `${"item" in options}:${options.item === undefined ? "u" : options.item.name}`;
  console.log(read());
  options.item = { name: "held" };
  options.run = () => 4;
  console.log(read(), callCallback(options.run));
}

nested();
nested({ item: undefined });

// The parameter is used only inside a nested function; discovery must still
// assign checked-dynamic storage before lowering that closure.
function closureOnly(options: { retryCount?: number } = {}): void {
  const read = (): string => `${"retryCount" in options}:${options.retryCount === undefined ? "u" : options.retryCount}`;
  console.log(read());
}

closureOnly();
closureOnly({ retryCount: undefined });
