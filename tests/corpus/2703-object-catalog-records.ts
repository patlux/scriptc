// Generated-provider catalog shape: Object.values over a readonly mapped
// record, then Object.assign({}, ...values) inside a generic flatten helper.
// Every shape and source-array element union is statically enumerable.
type Groups = Record<string, Record<string, object>>;
type ModelId<T extends Groups> = {
  [K in keyof T]: keyof T[K];
}[keyof T] & string;
type Catalog<T extends Groups> = {
  [K in ModelId<T>]: {
    id: K;
    label: string;
    rank: number;
  };
};

function flatten<const T extends Groups>(groups: T): Catalog<T> {
  return Object.assign({}, ...Object.values(groups)) as Catalog<T>;
}

const groups = {
  first: {
    alpha: { id: "alpha", label: "alpha", rank: 1 },
    beta: { id: "beta", label: "beta", rank: 2 },
  },
  second: {
    gamma: { id: "gamma", label: "gamma", rank: 3 },
    omega: { id: "omega", label: "omega", rank: 4 },
  },
} as const;

const catalog = flatten(groups);
const models = Object.values(catalog);
console.log(Object.keys(catalog).join(","));
console.log(models.map((model) => `${model.id}:${model.label}:${model.rank}`).join("|"));
console.log(catalog.beta.label, catalog.omega.rank);

// Fixed-record assign remains left-to-right and distinguishes a syntactic
// own-present undefined from a missing optional field.
const headers: { authorization: string | undefined; accept: string; trace: string } = {
  authorization: "old",
  accept: "json",
  trace: "base",
};
Object.assign(headers, { trace: "one" }, { authorization: undefined }, { trace: "two" });
console.log(String(headers.authorization), headers.accept, headers.trace);

// Large generated readonly catalog: enough fields to catch helper/codegen
// scaling regressions without making the corpus noisy.
const large = {
  m00: { id: "m00", label: "M00", rank: 0 }, m01: { id: "m01", label: "M01", rank: 1 },
  m02: { id: "m02", label: "M02", rank: 2 }, m03: { id: "m03", label: "M03", rank: 3 },
  m04: { id: "m04", label: "M04", rank: 4 }, m05: { id: "m05", label: "M05", rank: 5 },
  m06: { id: "m06", label: "M06", rank: 6 }, m07: { id: "m07", label: "M07", rank: 7 },
  m08: { id: "m08", label: "M08", rank: 8 }, m09: { id: "m09", label: "M09", rank: 9 },
  m10: { id: "m10", label: "M10", rank: 10 }, m11: { id: "m11", label: "M11", rank: 11 },
  m12: { id: "m12", label: "M12", rank: 12 }, m13: { id: "m13", label: "M13", rank: 13 },
  m14: { id: "m14", label: "M14", rank: 14 }, m15: { id: "m15", label: "M15", rank: 15 },
  m16: { id: "m16", label: "M16", rank: 16 }, m17: { id: "m17", label: "M17", rank: 17 },
  m18: { id: "m18", label: "M18", rank: 18 }, m19: { id: "m19", label: "M19", rank: 19 },
  m20: { id: "m20", label: "M20", rank: 20 }, m21: { id: "m21", label: "M21", rank: 21 },
  m22: { id: "m22", label: "M22", rank: 22 }, m23: { id: "m23", label: "M23", rank: 23 },
  m24: { id: "m24", label: "M24", rank: 24 }, m25: { id: "m25", label: "M25", rank: 25 },
  m26: { id: "m26", label: "M26", rank: 26 }, m27: { id: "m27", label: "M27", rank: 27 },
  m28: { id: "m28", label: "M28", rank: 28 }, m29: { id: "m29", label: "M29", rank: 29 },
  m30: { id: "m30", label: "M30", rank: 30 }, m31: { id: "m31", label: "M31", rank: 31 },
  m32: { id: "m32", label: "M32", rank: 32 }, m33: { id: "m33", label: "M33", rank: 33 },
  m34: { id: "m34", label: "M34", rank: 34 }, m35: { id: "m35", label: "M35", rank: 35 },
  m36: { id: "m36", label: "M36", rank: 36 }, m37: { id: "m37", label: "M37", rank: 37 },
  m38: { id: "m38", label: "M38", rank: 38 }, m39: { id: "m39", label: "M39", rank: 39 },
} as const;
const largeValues = Object.values(large);
console.log(largeValues.length, largeValues[0]!.id, largeValues[39]!.id);
console.log(largeValues.reduce((sum, model) => sum + model.rank, 0));
