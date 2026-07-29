import { EventStream } from "event-stream-static";

class UpperStream extends EventStream {
  upper(value: string): string {
    return this.render(value.toUpperCase());
  }
}

const stream = new UpperStream("event:");
console.log(stream.upper("ready"));
void stream.consume();
