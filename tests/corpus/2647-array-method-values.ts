// The measured pi-ai shape behind the misleading "array methods as values"
// diagnostic: a readonly string[] parameter in a helper, with join called
// directly while the helper is instantiated.
function buildProviderErrorPattern(patterns: readonly string[]): RegExp {
  return new RegExp(patterns.join("|"), "i");
}

console.log(buildProviderErrorPattern(["alpha", "beta"]).test("BETA"));
