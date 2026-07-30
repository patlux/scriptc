// @dynamic
// Dynamic import() of the program's OWN modules: the compiled module's
// exports marshal into the engine as a namespace object, and a module
// first reached through import() evaluates on the microtask — after the
// importer's synchronous code, exactly where Node evaluates it. A second
// import answers from the module cache (the run-once init guard): the
// side effect prints once. Composite members exit through the validated
// boundary at typed bindings, like every island handle. Repeated imports
// preserve the cached namespace and export identities.
async function main(): Promise<void> {
  console.log("start");
  const ns = await import("./mod.ts");
  console.log(ns.greet("dyn"));
  console.log(ns.add(2, 40));
  console.log(ns.answer);
  const cfg = ns.config;
  console.log(cfg.tool, cfg.version);
  const list = ns.list;
  console.log(list[1]);
  console.log(ns.default);
  const ns2 = await import("./mod.ts");
  console.log("second:", ns2.answer);
  console.log(
    "identity:",
    (ns as any) === (ns2 as any),
    (ns.greet as any) === (ns2.greet as any),
    (ns.config as any) === (ns2.config as any),
    (ns.default as any) === (ns2.default as any),
  );
}
main();
console.log("after main() call");
