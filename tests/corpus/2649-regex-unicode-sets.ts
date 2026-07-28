// RegExp unicode-sets (`v`) flag: character-class subtraction through the
// vendored libregexp engine, plus flags/source readback.
const consonants = /[[a-z]--[aeiou]]/v;
console.log(consonants.test("b"), consonants.test("a"));
console.log(consonants.source, consonants.flags);
