import catalog from "./data/catalog.json" with { type: "json" };

export function isSharedCatalog(value: unknown): boolean {
  return catalog === value;
}
