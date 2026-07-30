import { utf8ByteLength } from "buffer-constructor-static";

console.log(utf8ByteLength("ascii"));
console.log(utf8ByteLength("é"));
console.log(utf8ByteLength("😀"));
