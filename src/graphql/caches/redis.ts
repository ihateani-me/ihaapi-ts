import { RedisDB } from "../../controller";

export interface RCacheResult {
    value: any;
    ttl: number;
}

interface KeyValueCache<V> {
    get(key: string): Promise<V | undefined>;
    // ttl is specified in seconds
    set(key: string, value: V, options?: { ttl?: number | null }): Promise<void>;
    delete(key: string): Promise<boolean | void>;
}

export default class RedisCache implements KeyValueCache<RCacheResult> {
    redis: RedisDB;

    constructor(redis: RedisDB) {
        this.redis = redis;
    }

    async get(key: string): Promise<RCacheResult> {
        const [result, ttl] = await this.redis.get(key, true);

        return {
            value: result,
            ttl: ttl,
        };
    }

    async set(key: string, value: RCacheResult, options?: { ttl?: number | null }): Promise<void> {
        if (options?.ttl) {
            await this.redis.setex(key, options.ttl, value.value);
        } else {
            await this.redis.set(key, value.value);
        }
    }

    async delete(key: string): Promise<boolean | void> {
        const res = await this.redis.client.del(key);
        return res >= 1;
    }
}
