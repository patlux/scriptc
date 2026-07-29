// @dynamic
// Array#shift adds the empty-array undefined result. For unknown[] and any[]
// that unit is already part of the element representation: keep dyn/jsval
// directly, never construct an invalid tagged union containing either arm.
const checked: unknown[] = [41, undefined];
const checkedA: unknown = checked.shift();
const checkedB: unknown = checked.shift();
const checkedC: unknown = checked.shift();
console.log(typeof checkedA === "number" ? checkedA : -1);
console.log(checkedB === undefined);
console.log(checkedC === undefined);

const island: any[] = ["engine", undefined];
const islandA: any = island.shift();
const islandB: any = island.shift();
const islandC: any = island.shift();
console.log(`${islandA}`);
console.log(islandB === undefined);
console.log(islandC === undefined);
