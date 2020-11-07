import { Tedis } from "tedis";
import { is_none } from "../utils/swissknife";
import { inspect } from "util";

export class RedisDB {
    client: Tedis
    usable: boolean
    host: string
    port: number

    constructor(host: string, port: number, password?: string) {
        this.host = host;
        this.port = port;
        if (!is_none(password)) {
            var tedis = new Tedis({
                host: host,
                port: port,
                password: password
            });
        } else {
            var tedis = new Tedis({
                host: host,
                port: port
            });
        }
        this.client = tedis;
        this.usable = true;
    }

    close() {
        this.client.close();
    }

    private async safe_call(callback: Function): Promise<any> {
        try {
            let res = await callback();
            return res;
        } catch (e) {
            console.error(e);
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
            if (!isNaN(parseFloat(value))) {
                value = parseFloat(value);
            }
        }
        return value;
    }

    async get(key: string): Promise<any> {
        var res = await this.client.get(key);
        return this.toOriginal(res);
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