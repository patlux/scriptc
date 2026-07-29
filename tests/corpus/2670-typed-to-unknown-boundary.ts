// Safe typed→unknown checked-dynamic conversion: recursively representable
// data deep-copies, generic T resolves to the concrete instantiation, and
// callback arguments cross through the same conversion. Both backends run
// this differentially; the sanitized lane audits nested RC ownership.
//
// Deep-copy (non-alias) is intentional dynFrom semantics — Node would
// alias. The differential corpus stays Node-byte-identical, so it pins
// structural integrity only; dyncheck owns the non-alias assertion.

type Leaf = { label: string; weight: number | null };
type Payload = {
  id: string;
  enabled: boolean;
  leaves: Leaf[];
  meta: { note?: string; order: number[] };
};

function hold<T>(value: T): unknown {
  return value;
}

function apply<T>(value: T, callback: (input: unknown) => string): string {
  return callback(value);
}

const original: Payload = {
  id: "root",
  enabled: true,
  leaves: [
    { label: "a", weight: 1 },
    { label: "b", weight: null },
  ],
  meta: { note: undefined, order: [2, 1] },
};

const boxed = hold(original);
const narrowed = boxed as Payload;
console.log(
  narrowed.id,
  narrowed.enabled,
  narrowed.leaves[0].label,
  narrowed.leaves[1].weight === null,
  narrowed.meta.order.join(","),
);

// Fresh values at the callback boundary stay structurally intact under
// generic instantiation — no mutation after the slot, so Node and native
// agree byte-for-byte.
console.log(
  apply(
    {
      id: "cb",
      enabled: false,
      leaves: [{ label: "c", weight: 3 }],
      meta: { order: [9] },
    },
    (input) => {
      const value = input as Payload;
      return `${value.id}:${value.leaves.length}:${value.meta.order[0]}:${value.leaves[0].weight}`;
    },
  ),
);

// Scalars and unit arms use their exact checked-dynamic kinds.
// Bare `undefined` is not a static monotype; optional-flavored unions are
// the representable form that carries a unit arm into unknown.
function scalar<T>(value: T): unknown {
  return value;
}
function fromOptional(value: string | undefined): unknown {
  return value;
}
console.log(typeof scalar(4), typeof scalar("x"), typeof scalar(false));
console.log(scalar(null) === null, fromOptional(undefined) === undefined);

// RC churn: nested records/arrays/unions cross and release repeatedly.
let total = 0;
for (let i = 0; i < 100; i++) {
  const value = hold({ rows: [{ n: i, text: `v${i}` }], maybe: i % 2 === 0 ? null : `m${i}` });
  const back = value as { rows: { n: number; text: string }[]; maybe: string | null };
  total += back.rows[0].n;
  if (back.maybe === null) total += 1;
}
console.log(total);
