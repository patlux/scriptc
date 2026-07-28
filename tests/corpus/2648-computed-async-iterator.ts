// Well-known computed method names beyond Symbol.iterator. This is the
// pi-ai [Symbol.asyncIterator] declaration shape; direct calls through the
// well-known key pin collection, lowering, and dispatch on both backends.
class AsyncValues {
  [Symbol.asyncIterator](): string {
    return "async-values";
  }
}

const values = new AsyncValues();
console.log(values[Symbol.asyncIterator]());
