import "auth-context-runtime";
import { defaultProviderAuthContext } from "auth-context-static";

async function main() {
  /** @type {import("auth-context-static").AuthContext} */
  const context = await defaultProviderAuthContext();
  console.log(await context.env("SCRIPTC_TEST_ENV"));
  console.log(await context.fileExists("/scriptc-auth-context-present"));
}

main();
