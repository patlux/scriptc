import { cache } from "./b.ts";

export function setFromA(key: string, value: number): void {
  cache.set(key, value);
}

export function getFromA(key: string): number | undefined {
  return cache.get(key);
}
