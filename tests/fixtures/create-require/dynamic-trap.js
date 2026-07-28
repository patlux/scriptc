import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const spec = process.env["SCRIPTC_CREATE_REQUIRE_SPEC"] ?? "resolvable-missing";
try {
  require(spec);
  console.log("loaded");
} catch (error) {
  console.log(error instanceof Error, error.code);
}
