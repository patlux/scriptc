// Generic ??= fails closed when the lvalue has no sound static reference
// form: arrays use the documented trap-on-miss element model.

const arrayValues: (string | undefined)[] = [];
arrayValues[0] ??= "x";
