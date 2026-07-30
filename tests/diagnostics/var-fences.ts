// `var` now has full undefined-at-entry hoisting. Its remaining SC1030
// boundary is the unsupported for-await loop-binding form.
async function consume(): Promise<void> {
  for await (var chunk of process.stdin) {
    console.log(chunk.length);
  }
}

consume();
