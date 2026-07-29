import { matchArity } from "typebox-match-static";

console.log(matchArity());
console.log(matchArity("x"));
console.log(matchArity("x", "y") === undefined);
