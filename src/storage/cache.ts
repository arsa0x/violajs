import type { CacheStore } from "@oxidezap/baileyrs";

export class TtlCache implements CacheStore {
  private map = new Map<string, { v: unknown; exp: number }>();
  constructor(
    private max = 500,
    private ttlMs = 5 * 60_000,
  ) {}

  get<T>(key: string): T | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.exp < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, e);
    return e.v as T;
  }
  set<T>(key: string, value: T): void {
    this.map.delete(key);
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { v: value, exp: Date.now() + this.ttlMs });
  }
  del(key: string): void {
    this.map.delete(key);
  }
  flushAll(): void {
    this.map.clear();
  }
}
