// @deferred-fences: 1
// Dynamic object rest keeps an honest runtime fence until the remaining
// runtime key set can pack into a fresh checked-dynamic object.
function collectRest({ keep, ...remaining } = {}) {
  return `${keep}:${remaining.extra}`;
}
if (process.env.SCRIPTC_NEVER === "yes") {
  console.log(collectRest({ keep: true, extra: 1 }));
}
console.log("fenced");
