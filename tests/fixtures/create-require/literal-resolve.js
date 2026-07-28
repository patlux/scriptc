import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
console.log(require.resolve("node:fs"));
console.log(require.resolve("./data.json"));
console.log(require.resolve("resolvable-pkg"));
