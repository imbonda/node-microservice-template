// 3rd party.
import NodeCache, { type Key } from 'node-cache';

export class Cache {
    private static DEFAULT_TTL_SEC = 60;

    private ttl: number;

    private cache: NodeCache;

    constructor(ttl?: number) {
        this.ttl = ttl || Cache.DEFAULT_TTL_SEC;
        this.cache = new NodeCache();
    }

    public add(key: Key): boolean {
        return this.set(key, true);
    }

    public has(key: Key): boolean {
        return this.cache.has(key);
    }

    public set<T>(key: Key, value: T): boolean {
        return this.cache.set(key, value, this.ttl);
    }

    public get<T>(key: Key): T {
        return this.cache.get(key);
    }

    public del(keys: Key | Key[]): void {
        this.cache.del(keys);
    }

    public items(): Record<Key, unknown> {
        const items = {};
        this.cache.keys().forEach((key) => {
            const value = this.get(key);
            if (value !== undefined) {
                items[key] = value;
            }
        });
        return items;
    }
}
