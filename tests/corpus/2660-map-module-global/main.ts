import { cache, clearCache, deleteCache, getFromB, orderFromB } from "./b.ts";
import { getFromA, setFromA } from "./a.ts";

setFromA("first", 1);
setFromA("second", 2);
console.log(getFromA("first"), getFromB("second"), cache === cache, orderFromB());
console.log(deleteCache("first"), orderFromB());
clearCache();
console.log(getFromA("second"), orderFromB());
