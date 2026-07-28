import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const suffix = process.argv.length > 2 ? "-pkg" : "-missing";
const direct = "resolvable" + suffix;
for (const spec of [direct, process.argv.length > 2 ? "resolvable-pkg" : "resolvable-missing"]) {
  try {
    require(spec);
    console.log("loaded");
  } catch {
    console.log("missing");
  }
}
