// Nullable constructor/class-value boundary: the class stays static through
// the union, truthiness narrows it, construction dispatches through the
// class value, and the returned base methods/array iteration remain native.
interface SegmenterLike {
  segment(text: string): string[];
}
class BasicSegmenter implements SegmenterLike {
  private readonly prefix: string;
  constructor(prefix: string) {
    this.prefix = prefix;
  }
  segment(text: string): string[] {
    return [`${this.prefix}:${text}`];
  }
}
class AlternateSegmenter extends BasicSegmenter {
  constructor(prefix: string) {
    super(`alt-${prefix}`);
  }
}
type SegmenterConstructor = new (prefix: string) => BasicSegmenter;
function createSegmenter(prefix: string, ctor: SegmenterConstructor | null): BasicSegmenter {
  return ctor ? new ctor(prefix) : new BasicSegmenter(prefix);
}
for (const ctor of [null, AlternateSegmenter] as (SegmenterConstructor | null)[]) {
  const segmenter = createSegmenter("g", ctor);
  for (const part of segmenter.segment("ok")) console.log(part, !!ctor);
}
