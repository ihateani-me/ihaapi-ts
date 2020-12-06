import Redis = require("ioredis");
import { fallbackNaN, is_none } from "../utils/swissknife";

export class RedisDB {
    client: Redis.Redis
    usable: boolean
    host: string
    port: number

    constructor(host: string, port: number, password?: string) {
        this.host = host;
        this.port = port;
        if (!is_none(password)) {
            var redis_db = new Redis(port, host, {
                "password": password,
            });
        } else {
            var redis_db = new Redis(port, host, {
                "password": password,
            });
        }
        this.client = redis_db;
        this.usable = true;
    }

    close() {
        this.client.disconnect();
    }

    private async safe_call(callback: Function): Promise<any> {
        try {
            let res = await callback();
            return res;
        } catch (e) {
            console.error(e);
            return null;
        }
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
        } catch (e) {};
        if (typeof value === "string") {
            value = fallbackNaN(parseFloat, value);
        }
        return value;
    }

    async get(key: string, return_ttl: boolean = false): Promise<any> {
        let res = await this.client.get(key);
        res = this.toOriginal(res);
        if (return_ttl && !is_none(res)) {
            let ttl_left = await this.client.ttl(key);
            return [res, ttl_left];
        } else if (return_ttl && is_none(res)) {
            return [res, 0]
        }
        return res;
    }

    async set(key: string, value: any): Promise<boolean> {
        let res = await this.client.set(key, this.stringify(value));
        if (res == "OK") {
            return true;
        }
        return false;
    }

    async setex(key: string, expired: number, value: any): Promise<any> {
        if (Number.isInteger(expired)) {
            expired = Math.ceil(expired);
        }
        let res = await this.client.setex(key, expired, this.stringify(value));
        if (res == "OK") {
            return true;
        }
        return false;
    }

    async ping(): Promise<void> {
        console.log(`[RedisClient:${this.host}] Pinging server...`);
        var res = await this.safe_call(this.get.bind(this, "ping"));
        if (is_none(res)) {
            var res_set = await this.safe_call(this.set.bind(this, "ping", "pong"));
            if (!res_set) {
                console.error(`[RedisClient:${this.host}] Ping failed, not usable!`);
                this.usable = false;
                return;
            }
            res = await this.safe_call(this.get.bind(this, "ping"));
        }
        if (res !== "pong") {
            console.error(`[RedisClient:${this.host}] Ping failed, not usable!`);
            this.usable = false;
        } else {
            console.log(`[RedisClient:${this.host}] Pong!`);
            this.usable = true;
        }
    }
}