// Nullish assignment through record properties and computed keys: the
// receiver/key evaluate once, the value read evaluates once, and RHS/write
// are lazy. Only null/undefined assign; false, 0, and "" stay untouched.

interface Slots {
  text?: string | null;
  count?: number;
  enabled?: boolean;
  unknownValue: unknown;
}

let receiverCalls = 0;
let keyCalls = 0;
let rhsCalls = 0;

const slots: Slots = {
  text: undefined,
  count: 0,
  enabled: false,
  unknownValue: null,
};

function receiver(): Slots {
  receiverCalls = receiverCalls + 1;
  return slots;
}

function key(): "text" {
  keyCalls = keyCalls + 1;
  return "text";
}

function rhs(label: string): string {
  rhsCalls = rhsCalls + 1;
  return label;
}

receiver().text ??= rhs("property");
console.log(slots.text, receiverCalls, rhsCalls);

slots.text = null;
receiver()[key()] ??= rhs("computed");
console.log(slots.text, receiverCalls, keyCalls, rhsCalls);

receiver()[key()] ??= rhs("skipped");
console.log(slots.text, receiverCalls, keyCalls, rhsCalls);

slots.count ??= 9;
slots.enabled ??= true;
console.log(slots.count, slots.enabled);

slots.text = "";
slots.text ??= rhs("empty");
console.log(slots.text.length, rhsCalls);

slots.unknownValue ??= rhs("unknown");
console.log(slots.unknownValue, rhsCalls);
slots.unknownValue ??= rhs("unknown-skipped");
console.log(slots.unknownValue, rhsCalls);

const dict: Record<string, string | undefined> = {};
let dynamicKey = "missing";
dict[dynamicKey] ??= rhs("index");
console.log(dict[dynamicKey], rhsCalls);
dict[dynamicKey] ??= rhs("index-skipped");
console.log(dict[dynamicKey], rhsCalls);

const unknownDict: Record<string, unknown> = { nil: undefined, kept: 0 };
unknownDict["nil"] ??= "filled";
unknownDict["kept"] ??= 7;
console.log(JSON.stringify(unknownDict));

// An index-signature read can miss even without noUncheckedIndexedAccess;
// ??= must observe the runtime undefined rather than trap on the typed read.
const typedMissing: Record<string, string> = {};
typedMissing["new"] ??= "created";
console.log(typedMissing["new"]);

// Presence, not only the index value's static type, controls the read: a
// missing key assigns, own-present undefined assigns, and a value skips.
// A dynamic key stays single-evaluation and record overflow insertion order
// remains the same order Object.values observes.
const presenceDict: Record<string, string | undefined> = {
  presentUndefined: undefined,
  presentValue: "kept",
};
let presenceKeyCalls = 0;
function presenceKey(name: string): string {
  presenceKeyCalls = presenceKeyCalls + 1;
  return name;
}
const missingResult = presenceDict[presenceKey("missing")] ??= "made";
const undefinedResult = presenceDict[presenceKey("presentUndefined")] ??= "filled";
const valueResult = presenceDict[presenceKey("presentValue")] ??= "ignored";
console.log(missingResult, undefinedResult, valueResult, presenceKeyCalls);
console.log(Object.values(presenceDict).join("|"));

const objectResultDict: Record<string, { label: string }> = {};
const assignedObject = objectResultDict["made"] ??= { label: "owned" };
const skippedObject = objectResultDict["made"] ??= { label: "other" };
console.log(assignedObject.label, skippedObject.label, assignedObject === skippedObject);

// Accessors prove the read/write split: getter once on both paths, setter
// only on the nullish path.
let accessorValue: string | undefined;
let getterCalls = 0;
let setterCalls = 0;
const accessor = {
  get value(): string | undefined {
    getterCalls = getterCalls + 1;
    return accessorValue;
  },
  set value(next: string | undefined) {
    setterCalls = setterCalls + 1;
    accessorValue = next;
  },
};
accessor.value ??= "set";
accessor.value ??= "skip";
console.log(accessorValue, getterCalls, setterCalls);
