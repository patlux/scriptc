// A class expression inside a function mints a distinct constructor on every
// call. It must remain outside the immortal class-object representation, and
// the unsupported value must stay fenced rather than becoming dyn/jsval.
function makeClass() {
  return class {
    value(): string {
      return "fresh";
    }
  };
}

const unsupported: unknown = makeClass();
void unsupported;
