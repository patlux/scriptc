import {
  entriesText,
  iteratorLengths,
  keysText,
  read,
  readOwnThrough,
  remove,
  reset,
  schedule,
  valuesLoop,
  valuesText,
  write,
} from "map-global-static";

console.log(iteratorLengths());
write("first", 1);
write("second", 2);
write("third", 3);
write("second", 20);
console.log(read("first"), schedule("second")(), readOwnThrough("third"));
console.log(keysText(), valuesText(), valuesLoop());
console.log(entriesText());
console.log(remove("second"));
write("second", 200);
console.log(keysText(), readOwnThrough("second"));
reset();
console.log(read("second"), iteratorLengths());
