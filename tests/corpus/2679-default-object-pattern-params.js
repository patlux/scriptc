// Default-empty object parameter destructuring in emitted JavaScript:
// functions, arrows, shorthand methods and extracted callbacks all keep
// JS's omitted/undefined/default/presence semantics and one callback value.
function named({ keep, present: renamed, fallback = "field" } = {}) {
  return `${keep}:${renamed}:${fallback}`;
}

const arrow = ({ keep: alias = true } = {}) => `${alias}`;

const holder = {
  release({ keep = true } = {}) {
    return `${keep}`;
  },
};

function invoke(callback) {
  return callback({ keep: false });
}

const release = holder.release;
console.log(named());
console.log(named(undefined));
console.log(named({}));
console.log(named({ keep: false, present: "yes", fallback: undefined }));
console.log(arrow(), arrow(undefined), arrow({}), arrow({ keep: false }));
console.log(release === holder.release);
console.log(release(), release(undefined), release({}), invoke(release));
