import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function childUrlCheck() {
  return import.meta.url.includes("nested%20space/child.ts");
}

export function childFileCheck() {
  return fileURLToPath(import.meta.url).endsWith("/nested space/child.ts");
}

export function childDirCheck() {
  return dirname(fileURLToPath(import.meta.url)).endsWith("/2651-import-meta-url/nested space");
}
