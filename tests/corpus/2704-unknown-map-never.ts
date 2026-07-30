// Provider-registry-shaped checked-dynamic Map values. Typed inputs use the
// existing typed→unknown deep-copy boundary; reads preserve missing-key
// undefined and checked casts validate the dynamic payload back to data.
// `never` is control-flow bottom: throw-only branches and joins require no
// runtime value representation.

type Provider = {
  enabled: boolean;
  id: string;
  options: { attempts: number; tags: string[] };
};

const providers = new Map<string, unknown>();

function register(id: string, provider: Provider): void {
  providers.set(id, provider);
}

function lookup(id: string): Provider | undefined {
  const value = providers.get(id);
  if (value === undefined) return undefined;
  return value as Provider;
}

function fail(message: string): never {
  throw new Error(message);
}

function required(id: string): Provider {
  return lookup(id) ?? fail(`missing:${id}`);
}

function choose(flag: boolean): Provider {
  return flag ? required("alpha") : fail("unselected");
}

function increment(value: number): number {
  return value + 1;
}

register("alpha", {
  enabled: true,
  id: "alpha",
  options: { attempts: 3, tags: ["native", "safe"] },
});
providers.set("explicit-undefined", undefined);
providers.set("increment", increment);
const first = required("alpha");
const chosen = choose(true);
const boxedIncrement = providers.get("increment") as (value: number) => number;
console.log(first.id, first.options.attempts, first.options.tags.join(","));
console.log(chosen.enabled, lookup("missing") === undefined, providers.has("alpha"));
console.log(
  providers.has("explicit-undefined"),
  providers.get("explicit-undefined") === undefined,
  providers.has("absent"),
);
console.log(boxedIncrement === increment, boxedIncrement(4));

let total = 0;
for (let i = 0; i < 100; i++) {
  register("churn", {
    enabled: i % 2 === 0,
    id: `p${i}`,
    options: { attempts: i, tags: [`t${i}`] },
  });
  total += required("churn").options.attempts;
  providers.delete("churn");
}
console.log(total, providers.has("churn"));
