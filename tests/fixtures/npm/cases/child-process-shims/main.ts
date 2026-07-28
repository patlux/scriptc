// @dynamic
// The island's child_process shim, differentially against Node: piped output,
// exit/error events, cwd/env replacement, detached process groups, and kill.
import { report } from "childzoo";

async function run(): Promise<void> {
  const out: string = await report();
  console.log(out);
}
run();
