// @dynamic
// A dynamic object crosses from unknown into a fixed structural record
// whose required fields are callable. The boundary checks required keys
// and callability, ignores extras, binds the source object as `this`,
// forwards args, preserves async fulfillment/rejection, and retains cleanly.

/**
 * @typedef {{
 *   env: (name: any) => Promise<string | undefined>,
 *   fileExists: (path: any) => Promise<boolean>
 * }} Context
 */

/** @param {unknown} value @returns {unknown} */
function opaque(value) {
  return value;
}

/** @param {unknown} value @returns {Context} */
function asContext(value) {
  if (typeof value.env !== "function") throw new TypeError("env must be a function");
  if (typeof value.fileExists !== "function") throw new TypeError("fileExists must be a function");
  return value;
}

/** @param {string} prefix @param {any} name @returns {Promise<string | undefined>} */
async function envResult(prefix, name) {
  if (name === "reject") return Promise.reject(new Error("async boom"));
  if (name === "missing") return undefined;
  return prefix + name;
}

/** @this {{ prefix: string }} @param {any} name @returns {Promise<string | undefined>} */
function env(name) {
  if (name === "sync-throw") throw new Error("sync boom");
  return envResult(this.prefix, name);
}

/** @this {{ prefix: string }} @param {any} path @returns {Promise<boolean>} */
async function fileExists(path) {
  return this.prefix === "ctx:" && path === "/ok";
}

/** @returns {Promise<boolean>} */
async function yes() {
  return true;
}

async function main() {
  const raw = opaque({ prefix: "ctx:", extra: 17, env, fileExists });
  const ctx = asContext(raw);
  console.log(await ctx.env("TOKEN"));
  console.log(await ctx.fileExists("/ok"));

  try {
    asContext(opaque({ fileExists: yes }));
  } catch (error) {
    console.log(error instanceof TypeError, error instanceof Error ? error.message : String(error));
  }

  try {
    asContext(opaque({ env: 3, fileExists: yes }));
  } catch (error) {
    console.log(error instanceof TypeError, error instanceof Error ? error.message : String(error));
  }

  try {
    const pending = ctx.env("sync-throw");
    console.log("returned-before-sync-throw");
    await pending;
  } catch (error) {
    console.log(error instanceof Error, error instanceof Error ? error.message : String(error));
  }

  try {
    await ctx.env("reject");
  } catch (error) {
    console.log(error instanceof Error, error instanceof Error ? error.message : String(error));
  }

  for (let i = 0; i < 40; i++) {
    const again = asContext(raw);
    if ((await again.fileExists(i === 39 ? "/ok" : "/no")) && i !== 39) {
      console.log("unreachable");
    }
  }
  console.log("done");
}

main();
