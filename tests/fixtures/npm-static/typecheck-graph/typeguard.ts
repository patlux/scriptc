import { isThing } from "typeguarded";

const value: unknown = { code: "ok" };
if (isThing(value)) console.log(value.code);
