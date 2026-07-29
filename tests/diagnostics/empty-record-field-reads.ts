// Ambiguous / unproven empty-record field reads stay fenced:
// - a computed empty expression needs a bind before a miss can fold
// - a non-empty fixed record still refuses undeclared names (no phantom keys)
// @ts-nocheck — inventory residual is the compiler fence, not tsc.

function side() {
  console.log("side");
  const o = {};
  return o;
}

// Impure empty-record receiver: always-absent, but evaluation has effects.
const _a = side().fg;

// Non-empty fixed shape: reading an undeclared name is not an empty miss.
const theme = { bg: "paper" };
const _b = theme.fg;
