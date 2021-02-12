import Redis from "ioredis";
import winston from "winston";

import { logger as MainLogger } from "../utils/logger";
import { fallbackNaN, is_none, Nulled } from "../utils/swissknife";

export class RedisDB {
    client: Redis.Redis;
    usable: boolean;
    host: string;
    port: number;
    logger: winston.Logger;

    constructor(host: string, port: number, password?: string | Nulled) {
        this.host = host;
        this.port = port;
        let redis_db;
        if (!is_none(password)) {
            redis_db = new Redis(port, host, {
                password: password,
            });
        } else {
            redis_db = new Redis(port, host);
        }
        this.client = redis_db;
        this.usable = true;
        this.logger = MainLogger.child({ cls: "RedisDB" });
    }

    close() {
        this.client.disconnect();
    }

    private async safe_call(callback: Function): Promise<any> {
        const logger = this.logger.child({ fn: "safeCall" });
        try {
            const res = await callback();
            return res;
        } catch (e) {
            logger.error(e);
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
        } catch (e) {}
        if (typeof value === "string") {
            value = fallbackNaN(parseFloat, value);
        }
        return value;
    }

    async get(key: string, return_ttl: boolean = false): Promise<any> {
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

    async set(key: string, value: any): Promise<boolean> {
        const res = await this.client.set(key, this.stringify(value));
        if (res == "OK") {
            return true;
        }
        return false;
    }

    async setex(key: string, expired: number, value: any): Promise<any> {
        if (Number.isInteger(expired)) {
            expired = Math.ceil(expired);
        }
        const res = await this.client.setex(key, expired, this.stringify(value));
        if (res == "OK") {
            return true;
        }
        return false;
    }

    async ping(): Promise<void> {
        const logger = this.logger.child({ fn: "ping" });
        logger.info(`Pinging ${this.host} server...`);
        let res = await this.safe_call(this.get.bind(this, "ping"));
        if (is_none(res)) {
            const res_set = await this.safe_call(this.set.bind(this, "ping", "pong"));
            if (!res_set) {
                logger.error(`Ping ${this.host} failed, not usable!`);
                this.usable = false;
                return;
            }
            res = await this.safe_call(this.get.bind(this, "ping"));
        }
        if (res !== "pong") {
            logger.error(`Ping ${this.host} failed, not usable!`);
            this.usable = false;
        } else {
            logger.info(`${this.host} Pong!`);
            this.usable = true;
        }
    }
}
