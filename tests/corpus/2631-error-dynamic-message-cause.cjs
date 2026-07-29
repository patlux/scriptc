// @dynamic
'use strict';

function makeError(value) {
  return new Error(value);
}

const values = [17, true, null, [1, 2], { x: 1 }, { toString() { return 'custom object'; } }];
for (const value of values) {
  console.log(makeError(value).message);
}

try {
  makeError({ toString() { throw new RangeError('convert boom'); } });
} catch (err) {
  if (err instanceof RangeError) console.log('caught', err.message);
}

try {
  makeError(Symbol('message'));
} catch {
  console.log('symbol throw');
}

class DirectError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'DirectError';
  }
}

class InheritedError extends Error {}

const directCause = 'direct root';
const direct = new DirectError({ toString() { return 'direct message'; } }, { cause: directCause });
console.log(direct.name, direct.message, direct.cause === directCause, direct.toString(), direct.cause);

const inheritedCause = 'inherited root';
const inherited = new InheritedError(42, { cause: inheritedCause });
console.log(inherited.name, inherited.message, inherited.cause === inheritedCause, inherited.cause);
