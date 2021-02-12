import IORedis from "ioredis";
import { RedisCache } from "apollo-server-cache-redis";

import { fallbackNaN, is_none } from "../../utils/swissknife";
import { logger as MainLogger } from "../../utils/logger";

// This is just reimplementation of dbconn/redis_client
export class CustomRedisCache extends RedisCache {
    client!: IORedis.Redis;

    constructor(options: IORedis.RedisOptions) {
        const logger = MainLogger.child({ cls: "GQLRedisCache" });
        logger.info(`Connecting to ${options.host}:${options.port}`);
        super(options);
    }

    private stringify(value: any): string {
        if (Array.isArray(value)) {
            value = JSON.stringify(value);
        } else if (typeof value === "object" && Object.keys(value).length > 0) {
            value = JSON.stringify(value);
        } else if (typeof value === "number") {
            value = value.toString();
        }
        return value;
    }

    private toOriginal(value: any): any {
        if (is_none(value)) {
            return null;
        }
        if (Buffer.isBuffer(value)) {
            return value;
        }
        try {
            // @ts-ignore
            value = JSON.parse(value);
        } catch (e) {}
        if (typeof value === "string") {
            value = fallbackNaN(parseFloat, value);
        }
        return value;
    }

    async getBetter(key: string, return_ttl: boolean = false): Promise<any> {
        let res = await this.client.get(key);
        res = this.toOriginal(res);
        if (return_ttl && !is_none(res)) {
            const ttl_left = await this.client.ttl(key);
            return [res, ttl_left];
        } else if (return_ttl && is_none(res)) {
            return [res, 0];
        }
        return res;
    }

    async setBetter(key: string, value: any): Promise<boolean> {
        const res = await this.client.set(key, this.stringify(value));
        if (res == "OK") {
            return true;
        }
        return false;
    }

    async setexBetter(key: string, expired: number, value: any): Promise<any> {
        if (Number.isInteger(expired)) {
            expired = Math.ceil(expired);
        }
        const res = await this.client.setex(key, expired, this.stringify(value));
        if (res == "OK") {
            return true;
        }
        return false;
    }
}
