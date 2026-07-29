import { normalizeStatus, onlyUndefined } from "status-unit-static";

interface ErrorShape {
  statusCode?: unknown;
  status?: unknown;
  $metadata?: { httpStatusCode?: unknown };
  $response?: { statusCode?: unknown };
}

const cases: ErrorShape[] = [
  {},
  { statusCode: 204 },
  { status: 205 },
];
for (const error of cases) {
  const normalized: { status?: number } = normalizeStatus(error);
  console.log(normalized.status ?? -1);
}

onlyUndefined({});
console.log("undefined-only:return");
