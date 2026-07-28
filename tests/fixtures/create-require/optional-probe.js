import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
function probe(name) {
  try {
    return String(require(name));
  } catch {
    return "fallback";
  }
}
console.log(probe(process.platform === "darwin" ? "missing-darwin-addon.node" : "missing-win32-addon.node"));
