// Public async generator methods, computed Symbol.asyncIterator lookup,
// await between yields, early IteratorClose, throw injection, and virtual
// dispatch through a base-typed consumer.
function pause(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 1));
}

class AsyncFeed {
  async *[Symbol.asyncIterator](): AsyncGenerator<string, number, undefined> {
    try {
      yield "base:open";
      await pause();
      yield "base:later";
      return 17;
    } finally {
      console.log("base:closed");
    }
  }
}

class AsyncLeaf extends AsyncFeed {
  override async *[Symbol.asyncIterator](): AsyncGenerator<string, number, undefined> {
    try {
      yield "leaf:open";
      return 23;
    } finally {
      console.log("leaf:closed");
    }
  }
}

async function consume(feed: AsyncFeed): Promise<void> {
  const direct = feed[Symbol.asyncIterator]();
  console.log((await direct.next()).value);
  console.log((await direct.return(99)).value);

  for await (const value of feed) {
    console.log(value);
    break;
  }

  const thrown = feed[Symbol.asyncIterator]();
  console.log((await thrown.next()).value);
  try {
    await thrown.throw(new Error("async-stop"));
  } catch (e) {
    if (e instanceof Error) console.log(e.message);
  }
}

async function main(): Promise<void> {
  await consume(new AsyncFeed());
  await consume(new AsyncLeaf());
}

void main();
