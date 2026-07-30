import { relocationMetadata as plain } from "import-meta-static";
import { metadata as scoped } from "@scope/import-meta-static";

const p = plain();
const s = scoped();
console.log("P\t" + p.join("\t"));
console.log("S\t" + s.join("\t"));
