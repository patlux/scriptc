var Reader = class {
  read = () => later;
};

var early = new Reader();
var later = "assigned";
var late = new Reader();
console.log(early.read(), late.read());
var later = "again";
console.log(early.read(), late.read());
