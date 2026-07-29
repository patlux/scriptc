// Public generator methods use the ordinary class dispatch rules while
// calls enter through generator-spawn wrappers. A three-level chain pins
// direct and virtual calls plus return/throw/finally behavior.
class BaseFeed {
  *values(): Generator<string, number, undefined> {
    try {
      yield "base";
      return 10;
    } finally {
      console.log("base:closed");
    }
  }
}

class MidFeed extends BaseFeed {
  override *values(): Generator<string, number, undefined> {
    try {
      yield "mid";
      return 20;
    } finally {
      console.log("mid:closed");
    }
  }
}

class LeafFeed extends MidFeed {
  override *values(): Generator<string, number, undefined> {
    try {
      yield "leaf";
      return 30;
    } finally {
      console.log("leaf:closed");
    }
  }
}

function drive(feed: BaseFeed): void {
  const g = feed.values();
  console.log(g.next().value);
  console.log(g.return(99).value);
}

drive(new BaseFeed());
drive(new MidFeed());
drive(new LeafFeed());

const thrown = new LeafFeed().values();
console.log(thrown.next().value);
try {
  thrown.throw(new Error("generator-stop"));
} catch (e) {
  if (e instanceof Error) console.log(e.message);
}
