// LLVM ownership regression: an erased AsyncIterable break yields a dynamic
// string, closes it, then a later async-generator operation must still own
// its independently yielded string. The old cleanup CFG released the first
// yielded payload twice and the later resume exposed the freed allocation.
function pause(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 1));
}

class Feed implements AsyncIterable<string> {
  tag: string;
  constructor(tag: string) {
    this.tag = tag;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<string, number, undefined> {
    try {
      yield `${this.tag}:open`;
      await pause();
      yield `${this.tag}:later`;
      return 17;
    } finally {
      console.log(`${this.tag}:closed`);
    }
  }

  iterable(): AsyncIterable<string, number, undefined> {
    return this;
  }
}

async function main(): Promise<void> {
  const feed = new Feed("feed");
  for await (const value of feed.iterable()) {
    console.log(value);
    break;
  }

  const later = feed[Symbol.asyncIterator]();
  console.log((await later.next()).value);
  await later.return(99);
  console.log("done");
}

void main();
