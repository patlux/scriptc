import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { childUrlCheck, childFileCheck, childDirCheck } from "./nested space/child.ts";

const ownFile = fileURLToPath(import.meta.url);
console.log("scheme", import.meta.url.startsWith("file://"));
console.log("file", ownFile.endsWith("/2651-import-meta-url/main.ts"));
console.log("dir", dirname(ownFile).endsWith("/2651-import-meta-url"));
console.log("includes", import.meta.url.includes("2651-import-meta-url"));
console.log("nested-url", childUrlCheck());
console.log("nested-file", childFileCheck());
console.log("nested-dir", childDirCheck());
