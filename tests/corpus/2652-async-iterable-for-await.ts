// Erased AsyncIterable/AsyncIterator declarations over native async
// generators: delayed next, body await, break/return/throw close exactly
// once, next throw propagation, close-error precedence, labeled exits, and
// nested loop cleanup.
function pause(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 1));
}

class Feed implements AsyncIterable<string> {
  closes = 0;
  tag: string;
  throwBeforeYield: boolean;
  throwOnClose: boolean;
  constructor(tag: string, throwBeforeYield = false, throwOnClose = false) {
    this.tag = tag;
    this.throwBeforeYield = throwBeforeYield;
    this.throwOnClose = throwOnClose;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<string, void, undefined> {
    try {
      if (this.throwBeforeYield) throw new Error(`${this.tag}:next`);
      await pause();
      yield `${this.tag}:1`;
      await pause();
      yield `${this.tag}:2`;
    } finally {
      this.closes++;
      console.log(`${this.tag}:close:${this.closes}`);
      if (this.throwOnClose) throw new Error(`${this.tag}:return`);
    }
  }
}

async function breakAfterAwait(src: AsyncIterable<string>): Promise<void> {
  for await (const value of src) {
    console.log(value);
    await pause();
    break;
  }
}

async function returnFromLoop(src: AsyncIterable<string>): Promise<string> {
  for await (const value of src) {
    console.log(value);
    return "returned";
  }
  return "exhausted";
}

async function throwFromBody(src: AsyncIterable<string>): Promise<void> {
  try {
    for await (const value of src) {
      console.log(value);
      await pause();
      throw new Error("body");
    }
  } catch (e) {
    if (e instanceof Error) console.log(`caught:${e.message}`);
  }
}

async function drainThrownNext(src: AsyncIterable<string>): Promise<void> {
  try {
    for await (const value of src) console.log(value);
  } catch (e) {
    if (e instanceof Error) console.log(`caught:${e.message}`);
  }
}

async function labeled(src: AsyncIterable<string>): Promise<void> {
  outer: for (let i = 0; i < 2; i++) {
    for await (const value of src) {
      console.log(`label:${i}:${value}`);
      break outer;
    }
  }
}

async function nested(outerSrc: AsyncIterable<string>, innerSrc: AsyncIterable<string>): Promise<void> {
  outer: for await (const x of outerSrc) {
    console.log(x);
    for await (const y of innerSrc) {
      console.log(y);
      break outer;
    }
  }
}

async function closeErrors(): Promise<void> {
  try {
    for await (const value of new Feed("close-break", false, true)) {
      console.log(value);
      break;
    }
  } catch (e) {
    if (e instanceof Error) console.log(`caught:${e.message}`);
  }
  try {
    for await (const value of new Feed("close-body", false, true)) {
      console.log(value);
      throw new Error("original-body");
    }
  } catch (e) {
    if (e instanceof Error) console.log(`caught:${e.message}`);
  }
}

async function main(): Promise<void> {
  const a = new Feed("break");
  await breakAfterAwait(a);
  console.log(`break-count:${a.closes}`);

  const b = new Feed("return");
  const returned = await returnFromLoop(b);
  console.log(returned);
  console.log(`return-count:${b.closes}`);

  const c = new Feed("body");
  await throwFromBody(c);
  console.log(`body-count:${c.closes}`);

  const d = new Feed("next", true);
  await drainThrownNext(d);
  console.log(`next-count:${d.closes}`);

  const e = new Feed("label");
  await labeled(e);
  console.log(`label-count:${e.closes}`);

  const f = new Feed("outer");
  const g = new Feed("inner");
  await nested(f, g);
  console.log(`nested-count:${f.closes}:${g.closes}`);

  await closeErrors();
}

void main();
