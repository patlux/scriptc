import { read, remove, reset, schedule, write } from "map-global-static";

write("first", 1);
write("second", 2);
console.log(read("first"), schedule("second")());
console.log(remove("first"), read("second"));
reset();
console.log(read("second"));
