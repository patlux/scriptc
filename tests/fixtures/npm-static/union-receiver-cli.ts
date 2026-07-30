import { loadPromptTemplate } from "union-receiver-static";

const bad = loadPromptTemplate("bad");
console.log(bad[0]!.code, bad[0]!.message);
console.log(loadPromptTemplate("good").length);
