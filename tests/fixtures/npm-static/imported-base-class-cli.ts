import { Formatter } from "class-derived-static";

function useFormatter(formatter: Formatter): void {
  console.log(formatter.render("x"));
  console.log(formatter.inherited("y"));
  console.log(formatter.identity() === formatter);
}

const direct = new Formatter("direct");
useFormatter(direct);
const made = Formatter.create("factory");
useFormatter(made);
console.log(direct === made);
