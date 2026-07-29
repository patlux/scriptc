// JS twin of the empty-record residual: defaulted empty options, direct
// theme.fg / theme.current reads, enumeration presence, and nested mutation
// through the dyn options bag. defaultEmptyObjectParam keeps the options
// ABI dyn so own-key presence matches Node; empty fixed layouts still
// answer undefined on misses.

function paint(theme = {}) {
  const fg = theme.fg;
  const current = theme.current;
  console.log(
    fg === undefined ? "u" : fg,
    current === undefined ? "u" : current,
    "fg" in theme,
    "current" in theme,
  );
}

paint();
paint({});
paint({ fg: "red" });
paint({ fg: undefined, current: "dark" });
paint({ fg: "blue", bg: "black", current: "light" });

// Empty fixed binding: miss is undefined, keys stay empty.
const empty = {};
console.log(empty.fg === undefined ? "u" : empty.fg, "fg" in empty, Object.keys(empty).join(",") || "-");

// Mutation + RC on a dyn options bag: writes stay observable on the same
// local through later reads (presence and values).
function mutate(options = {}) {
  options.tag = "held";
  options.n = (options.n === undefined ? 0 : options.n) + 1;
  console.log(options.n, options.tag, "tag" in options, "n" in options);
  return options.n;
}
console.log(mutate({ n: 1 }));
console.log(mutate({}));
console.log(mutate({ n: undefined }));

// Enumeration presence over a proven non-empty bag.
const cfg = { fg: "ink", current: "dark" };
console.log(Object.keys(cfg).sort().join(","), "fg" in cfg, cfg.missing === undefined ? "u" : "x");
