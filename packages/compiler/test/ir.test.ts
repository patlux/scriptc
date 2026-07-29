import { expect, test } from "vitest";
import { validateModule } from "../src/ir/validate.js";
import { deserializeModule, serializeModule } from "../src/ir/serialize.js";
import { fibModule } from "./fixtures/fib-ir.js";
import { recursiveImplicitInstance, type GenericInstance } from "../src/frontend/lowering/lower-calls.js";
import { BOOL, DYN, F64, JSVAL, STRING, VOID, typeEquals, typeKey, type IrModule, type IrType } from "../src/ir/nodes.js";

test("hand-built fib module validates", () => {
  expect(validateModule(fibModule)).toEqual([]);
});

test("fib module JSON round-trips", () => {
  const json = serializeModule(fibModule);
  expect(deserializeModule(json)).toEqual(fibModule);
});

test("all-arguments capture is part of function type identity and serialization", () => {
  const plain: IrType = { kind: "func", params: [STRING], ret: F64, rest: true };
  const all: IrType = { kind: "func", params: [STRING], ret: F64, rest: true, restAbi: "allDyn" };
  expect(typeKey(plain)).not.toBe(typeKey(all));
  expect(typeEquals(plain, all)).toBe(false);

  const mod = structuredClone(fibModule);
  mod.globals = [{ id: "%g.capture", name: "capture", type: all, mutable: false }];
  expect(deserializeModule(serializeModule(mod)).globals?.[0]?.type).toEqual(all);

  const malformed = structuredClone(fibModule);
  malformed.globals = [{ id: "%g.bad", name: "bad", type: { kind: "func", params: [], ret: F64, restAbi: "allDyn" }, mutable: false }];
  expect(validateModule(malformed).map((e) => e.message)).toContain('func type has restAbi "allDyn" without rest');
});

test("validator rejects invalid union arms and bare unit returns fail-closed", () => {
  const loc = { file: "t.ts", start: 0, end: 0 };
  const bad = structuredClone(fibModule);
  bad.unions = [
    { id: "u_jsval", arms: [{ kind: "jsval" }, { kind: "undefinedT" }] },
    { id: "u_dyn", arms: [{ kind: "dyn" }, { kind: "nullT" }] },
  ];
  bad.functions.push({
    name: "bareUndefined",
    params: [],
    returnType: { kind: "undefinedT" },
    locals: [],
    body: [
      {
        kind: "return",
        value: { kind: "unitLit", unit: "undefined", type: { kind: "undefinedT" }, loc },
        loc,
      },
    ],
    loc,
  });

  const errors = validateModule(bad).map((e) => e.message);
  expect(errors).toContain("union u_jsval: arm 0 is jsval");
  expect(errors).toContain("union u_dyn: arm 0 is dyn");
  expect(errors).toContain("in bareUndefined: return type is bare unit type undefinedT");
  expect(errors).toContain("in bareUndefined: bare unitLit 'undefined' outside a unionWrap");
});

test("validator accepts shift results only in canonical top or tagged representations", () => {
  const loc = { file: "t.ts", start: 0, end: 0 };
  const make = (elem: IrType, result: IrType): IrModule => ({
    irVersion: 3,
    sourceFile: "t.ts",
    entry: "__main",
    unions: result.kind === "union"
      ? [{ id: result.unionId, arms: [elem, { kind: "undefinedT" }] }]
      : [],
    functions: [{
      name: "__main",
      params: [],
      returnType: VOID,
      locals: [{ id: "xs.0", name: "xs", type: { kind: "array", elem }, mutable: false }],
      body: [{
        kind: "exprStmt",
        expr: {
          kind: "arrIntrinsic",
          method: "shift",
          receiver: { kind: "varRef", localId: "xs.0", type: { kind: "array", elem }, loc },
          args: [],
          type: result,
          loc,
        },
        loc,
      }],
      loc,
    }],
  });

  const fnElem: IrType = { kind: "func", params: [STRING], ret: VOID };
  const recordElem: IrType = { kind: "record", shapeId: "r0" };
  const recordMod = make(recordElem, { kind: "union", unionId: "u0" });
  recordMod.records = [{ id: "r0", fields: [{ name: "settled", type: BOOL }] }];

  expect(validateModule(make(JSVAL, JSVAL))).toEqual([]);
  expect(validateModule(make(DYN, DYN))).toEqual([]);
  expect(validateModule(make(F64, { kind: "union", unionId: "u0" }))).toEqual([]);
  expect(validateModule(make(fnElem, { kind: "union", unionId: "u0" }))).toEqual([]);
  expect(validateModule(recordMod)).toEqual([]);
  expect(validateModule(make(fnElem, fnElem)).map((e) => e.message)).toContain(
    "in __main: arrIntrinsic shift result must be the elem|undefined union",
  );
  expect(validateModule(make(JSVAL, { kind: "union", unionId: "u0" })).map((e) => e.message)).toContain(
    "union u0: arm 0 is jsval",
  );
});

test("validator rejects type mismatches and bad references", () => {
  const loc = { file: "t.ts", start: 0, end: 0 };
  const bad: IrModule = {
    irVersion: 3,
    sourceFile: "t.ts",
    entry: "__main",
    functions: [
      {
        name: "__main",
        params: [],
        returnType: { kind: "void" },
        locals: [{ id: "x.0", name: "x", type: F64, mutable: false }],
        body: [
          // init type mismatch: bool into f64 local
          { kind: "varDecl", localId: "x.0", init: { kind: "boolLit", value: true, type: BOOL, loc }, loc },
          // undeclared local
          { kind: "assign", localId: "y.0", value: { kind: "numLit", value: 1, type: F64, loc }, loc },
          // assign to immutable
          { kind: "assign", localId: "x.0", value: { kind: "numLit", value: 1, type: F64, loc }, loc },
          // call to unknown function
          { kind: "exprStmt", expr: { kind: "call", callee: "nope", args: [], type: F64, loc }, loc },
        ],
        loc,
      },
    ],
  };
  const errors = validateModule(bad).map((e) => e.message);
  expect(errors).toEqual([
    expect.stringContaining('init: expected f64, got bool'),
    expect.stringContaining('undeclared local/global "y.0"'),
    expect.stringContaining('immutable local "x"'),
    expect.stringContaining('undeclared function "nope"'),
  ]);
});

test("recursive implicit-any instances pin the checked-dynamic call ABI", () => {
  const inst: GenericInstance = {
    name: "%recursive%0",
    ordinal: 0,
    params: [{ type: STRING, mode: "required" }],
    returnType: DYN,
    bindings: new Map(),
    typeArgsText: "(string)",
    implicitState: "lowering",
    implicitInferReturn: true,
  };
  expect(recursiveImplicitInstance(inst)).toBe(inst);
  expect(inst.returnPinned).toBe(true);

  const settled: GenericInstance = { ...inst, returnPinned: undefined, implicitState: "done" };
  recursiveImplicitInstance(settled);
  expect(settled.returnPinned).toBeUndefined();
});

test("validator keeps direct-call return types fail-closed", () => {
  const loc = { file: "recursive.js", start: 0, end: 0 };
  const mod: IrModule = {
    irVersion: 3,
    sourceFile: "recursive.js",
    entry: "%main",
    functions: [
      {
        name: "%recursive%0",
        params: [{ localId: "value.0", name: "value", type: STRING }],
        returnType: DYN,
        locals: [{ id: "value.0", name: "value", type: STRING, mutable: true }],
        body: [{ kind: "return", value: { kind: "dynFrom", value: { kind: "strLit", value: "ok", type: STRING, loc }, type: DYN, loc }, loc }],
        loc,
      },
      {
        name: "%main",
        params: [],
        returnType: { kind: "void" },
        locals: [],
        body: [{ kind: "exprStmt", expr: { kind: "call", callee: "%recursive%0", args: [{ kind: "strLit", value: "x", type: STRING, loc }], type: STRING, loc }, loc }],
        loc,
      },
    ],
  };
  expect(validateModule(mod).map((e) => e.message)).toContain(
    "in %main: call %recursive%0 type string != return dyn",
  );
});

test("validator keeps island method arguments fail-closed", () => {
  const loc = { file: "method.js", start: 0, end: 0 };
  const mod: IrModule = {
    irVersion: 3,
    sourceFile: "method.js",
    entry: "%main",
    functions: [
      {
        name: "%main",
        params: [],
        returnType: { kind: "void" },
        locals: [],
        body: [
          {
            kind: "exprStmt",
            expr: {
              kind: "jsOp",
              op: "callMethod",
              name: "trim",
              args: [{ kind: "strLit", value: " x ", type: STRING, loc }],
              type: { kind: "jsval" },
              loc,
            },
            loc,
          },
        ],
        loc,
      },
    ],
  };
  expect(validateModule(mod).map((e) => e.message)).toContain(
    "in %main: jsOp callMethod arg must be jsval, got string",
  );
});

test("serializer round-trips ±Infinity and refuses NaN", () => {
  const mod = structuredClone(fibModule);
  const fn = mod.functions[0]!;
  const stmt = fn.body[0]!;
  if (stmt.kind === "if" && stmt.cond.kind === "bin" && stmt.cond.right.kind === "numLit") {
    stmt.cond.right.value = Infinity;
  }
  const back = deserializeModule(serializeModule(mod));
  const stmt2 = back.functions[0]!.body[0]!;
  if (stmt2.kind === "if" && stmt2.cond.kind === "bin" && stmt2.cond.right.kind === "numLit") {
    expect(stmt2.cond.right.value).toBe(Infinity);
  } else {
    throw new Error("round-trip lost the statement shape");
  }
  if (stmt.kind === "if" && stmt.cond.kind === "bin" && stmt.cond.right.kind === "numLit") {
    stmt.cond.right.value = -Infinity;
  }
  const back2 = deserializeModule(serializeModule(mod));
  const stmt3 = back2.functions[0]!.body[0]!;
  if (stmt3.kind === "if" && stmt3.cond.kind === "bin" && stmt3.cond.right.kind === "numLit") {
    expect(stmt3.cond.right.value).toBe(-Infinity);
  }
  if (stmt.kind === "if" && stmt.cond.kind === "bin" && stmt.cond.right.kind === "numLit") {
    stmt.cond.right.value = NaN;
  }
  expect(() => serializeModule(mod)).toThrow(/NaN/);
});

test("deserializer enforces IR version", () => {
  const json = serializeModule(fibModule).replace('"irVersion": 3', '"irVersion": 99');
  expect(() => deserializeModule(json)).toThrow(/version mismatch/);
});
