// URLSearchParams prototype methods are real unbound function values.
// call/apply supply the receiver once; a plain extracted invocation or a
// foreign receiver trips the WHATWG brand check before argument coercion.
'use strict';
const show = (fn) => {
  try {
    console.log('ret', JSON.stringify(fn()));
  } catch (e) {
    console.log(`${e.name}|${e.code}|${e.message}`);
  }
};
const params = new URLSearchParams('b=2&a=1&a=3');
const get = params.get;
const getAll = params.getAll;
const append = params.append;
const set = params.set;
const del = params.delete;
const has = params.has;
const sort = params.sort;
const stringify = params.toString;

show(() => get.call(params, 'a'));
show(() => getAll.apply(params, ['a']));
show(() => append.call(params, 'c', '4'));
show(() => set.apply(params, ['b', '5']));
show(() => has.call(params, 'c', '4'));
show(() => del.apply(params, ['a', '1']));
show(() => sort.call(params));
show(() => stringify.apply(params, []));
show(() => get('a'));
let converted = 0;
function argument() {
  converted += 1;
  return 'a';
}
show(() => get.call({}, argument()));
console.log('converted', converted);

let receiverCalls = 0;
function receiver() {
  receiverCalls += 1;
  return params;
}
show(() => get.call(receiver(), 'b'));
show(() => get.apply(receiver(), ['c']));
const boundGet = params.get.bind(params);
show(() => boundGet('b'));
console.log('receiverCalls', receiverCalls);
