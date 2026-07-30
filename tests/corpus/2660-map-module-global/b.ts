import { getFromA } from "./a.ts";

export const cache = new Map<string, number>();

export function getFromB(key: string): number | undefined {
  return getFromA(key);
}

export function deleteCache(key: string): boolean {
  return cache.delete(key);
}

export function clearCache(): void {
  cache.clear();
}

export function orderFromB(): string {
  return [...cache.keys()].join(",");
}
