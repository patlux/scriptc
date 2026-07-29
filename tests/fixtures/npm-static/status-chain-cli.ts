import { Loader, StatusIndicator } from "status-chain-static";

class DetailedStatus extends StatusIndicator {
  override render(value: string): string {
    return `detail:${value}`;
  }
}

function throughLoader(loader: Loader): string {
  return loader.render("ready");
}

const status: Loader = new StatusIndicator("status:");
const detailed: Loader = new DetailedStatus("unused:");
console.log(throughLoader(status));
console.log(throughLoader(detailed));
