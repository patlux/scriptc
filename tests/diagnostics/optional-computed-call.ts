// Optional computed calls deliberately stay bounded to string/number/
// boolean/checked-dynamic keys and dyn-representable argument values.
// Symbols need identity-bearing keyed storage; promises cannot cross the
// checked-dynamic call boundary. Both refuse at the call site, never by
// extracting an unbound function or silently routing through the engine.
const table: any = { run: (value: number) => value };
const symbolKey = Symbol("run");
table[symbolKey]?.(1);

class Instance {}
const instance = new Instance();
table["run"]?.(instance);
