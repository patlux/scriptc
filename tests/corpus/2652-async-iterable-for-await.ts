// Erased AsyncIterable/AsyncIterator declarations over native async
// generators: delayed next, body await, break/return/throw close exactly
// once, next throw propagation, close-error precedence, labeled exits, and
// nested loop cleanup.
function pause(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 1));
}

const closeEvents: string[] = [];

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
      const event = `${this.tag}:close:${this.closes}`;
      closeEvents.push(event);
      console.log(event);
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

async function continueSame(src: AsyncIterable<string>): Promise<void> {
  same: for await (const value of src) {
    console.log(`same:${value}`);
    if (value === "same:1") continue same;
    break;
  }
}

async function nestedContinue(
  outerSrc: AsyncIterable<string>,
  firstInner: AsyncIterable<string>,
  secondInner: AsyncIterable<string>,
): Promise<void> {
  outer: for await (const x of outerSrc) {
    console.log(`continue:${x}`);
    if (x === "continue-outer:1") {
      for await (const y of firstInner) {
        console.log(`continue:${y}`);
        continue outer;
      }
    }
    for await (const y of secondInner) {
      console.log(`continue:${y}`);
      continue outer;
    }
  }
}

async function tripleBreak(
  outerSrc: AsyncIterable<string>,
  middleSrc: AsyncIterable<string>,
  innerSrc: AsyncIterable<string>,
): Promise<void> {
  outer: for await (const x of outerSrc) {
    console.log(`triple-break:${x}`);
    for await (const y of middleSrc) {
      console.log(`triple-break:${y}`);
      for await (const z of innerSrc) {
        console.log(`triple-break:${z}`);
        break outer;
      }
    }
  }
}

async function tripleReturn(
  outerSrc: AsyncIterable<string>,
  middleSrc: AsyncIterable<string>,
  innerSrc: AsyncIterable<string>,
): Promise<string> {
  for await (const x of outerSrc) {
    console.log(`triple-return:${x}`);
    for await (const y of middleSrc) {
      console.log(`triple-return:${y}`);
      for await (const z of innerSrc) {
        console.log(`triple-return:${z}`);
        return "triple-returned";
      }
    }
  }
  return "triple-exhausted";
}

async function tripleThrow(
  outerSrc: AsyncIterable<string>,
  middleSrc: AsyncIterable<string>,
  innerSrc: AsyncIterable<string>,
): Promise<void> {
  try {
    for await (const x of outerSrc) {
      console.log(`triple-throw:${x}`);
      for await (const y of middleSrc) {
        console.log(`triple-throw:${y}`);
        for await (const z of innerSrc) {
          console.log(`triple-throw:${z}`);
          throw new Error("triple-body");
        }
      }
    }
  } catch (e) {
    if (e instanceof Error) console.log(`caught:${e.message}`);
  }
}

async function rejectAfterPause(): Promise<void> {
  await pause();
  throw new Error("awaited-body");
}

async function tripleAwaitReject(
  outerSrc: AsyncIterable<string>,
  middleSrc: AsyncIterable<string>,
  innerSrc: AsyncIterable<string>,
): Promise<void> {
  try {
    for await (const x of outerSrc) {
      console.log(`triple-reject:${x}`);
      for await (const y of middleSrc) {
        console.log(`triple-reject:${y}`);
        for await (const z of innerSrc) {
          console.log(`triple-reject:${z}`);
          await rejectAfterPause();
        }
      }
    }
  } catch (e) {
    if (e instanceof Error) console.log(`caught:${e.message}`);
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

  const same = new Feed("same");
  await continueSame(same);
  console.log(`same-count:${same.closes}`);

  const continueOuter = new Feed("continue-outer");
  const continueInner1 = new Feed("continue-inner-1");
  const continueInner2 = new Feed("continue-inner-2");
  await nestedContinue(continueOuter, continueInner1, continueInner2);
  console.log(`continue-count:${continueOuter.closes}:${continueInner1.closes}:${continueInner2.closes}`);

  const breakOuter = new Feed("break-outer");
  const breakMiddle = new Feed("break-middle");
  const breakInner = new Feed("break-inner");
  await tripleBreak(breakOuter, breakMiddle, breakInner);
  console.log(`triple-break-count:${breakOuter.closes}:${breakMiddle.closes}:${breakInner.closes}`);

  const returnOuter = new Feed("return-outer");
  const returnMiddle = new Feed("return-middle");
  const returnInner = new Feed("return-inner");
  console.log(await tripleReturn(returnOuter, returnMiddle, returnInner));
  console.log(`triple-return-count:${returnOuter.closes}:${returnMiddle.closes}:${returnInner.closes}`);

  const throwOuter = new Feed("throw-outer");
  const throwMiddle = new Feed("throw-middle");
  const throwInner = new Feed("throw-inner");
  await tripleThrow(throwOuter, throwMiddle, throwInner);
  console.log(`triple-throw-count:${throwOuter.closes}:${throwMiddle.closes}:${throwInner.closes}`);

  const rejectOuter = new Feed("reject-outer");
  const rejectMiddle = new Feed("reject-middle");
  const rejectInner = new Feed("reject-inner");
  await tripleAwaitReject(rejectOuter, rejectMiddle, rejectInner);
  console.log(`triple-reject-count:${rejectOuter.closes}:${rejectMiddle.closes}:${rejectInner.closes}`);

  await closeErrors();
  console.log(`close-events:${closeEvents.join("|")}`);
}

void main();
