// Functions that return undefined-or-value through declared, inferred, and
// checked-dynamic paths. The value-carrying cases must use a canonical tagged
// union; an inferred unit-only npm-style specialization must settle on dyn's
// own undefined instead of emitting a bare undefinedT return/unitLit.
interface StatusShape {
  statusCode?: unknown;
  status?: unknown;
}

function declaredStatus(error: StatusShape): number | undefined {
  if (typeof error.statusCode === "number") return error.statusCode;
  if (typeof error.status === "number") return error.status;
  return undefined;
}

function checkedStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = error.statusCode;
    if (typeof statusCode === "number") return statusCode;
  }
  return undefined;
}

function inferredStatus(error: StatusShape) {
  if (typeof error.statusCode === "number") return error.statusCode;
  return undefined;
}

function inferredUndefined(_value: unknown) {
  return undefined;
}

const render = (value: number | undefined): string => value === undefined ? "missing" : `status:${value}`;

console.log(render(declaredStatus({ statusCode: 201 })));
console.log(render(declaredStatus({})));
console.log(render(checkedStatus({ statusCode: 202 })));
console.log(render(checkedStatus({})));
console.log(render(inferredStatus({ statusCode: 203 })));
console.log(render(inferredStatus({})));
inferredUndefined({});
console.log("undefined-only:return");
