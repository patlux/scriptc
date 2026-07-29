function takeUnknown(value: unknown): void {
  console.log(typeof value);
}

class ArbitraryClass {
  value = 1;
}

// Arbitrary class identity/state is not a checked-dynamic data copy.
takeUnknown(new ArbitraryClass());

// Typed TypeScript promises are live async objects and cannot validate back
// out of unknown. The internal JS dynamic-promise lane is intentionally not
// an implicit typed boundary.
takeUnknown(Promise.resolve(1));

// Unsupported function pieces keep the pointed function-boundary refusal.
function takesMap(value: Map<string, number>): number {
  return value.size;
}
takeUnknown(takesMap);

// URL has a static representation, but no checked-dynamic URL kind or
// validated extraction yet; do not silently collapse it to an object husk.
takeUnknown(new URL("https://example.com/path"));
