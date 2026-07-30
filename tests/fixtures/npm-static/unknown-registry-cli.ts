import { hasProvider, lookupProvider, registerProvider, requiredProvider } from "unknown-registry-static";

registerProvider("alpha", {
  enabled: true,
  id: "alpha",
  options: { attempts: 2, tags: ["static", "checked"] },
});
const first = requiredProvider("alpha");
const miss = lookupProvider("missing");
console.log(first.id, first.options.attempts, first.options.tags.join(","));
console.log(first.enabled, miss === undefined, hasProvider("alpha"));
let total = 0;
for (let i = 0; i < 50; i++) {
  registerProvider("churn", {
    enabled: i % 2 === 0,
    id: `p${i}`,
    options: { attempts: i, tags: [`t${i}`] },
  });
  total += requiredProvider("churn").options.attempts;
}
console.log(total);
