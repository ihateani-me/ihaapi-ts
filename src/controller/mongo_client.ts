import winston from "winston";
import { Db, MongoClient } from "mongodb";

import { logger as MainLogger } from "../utils/logger";
import { capitalizeIt, is_none } from "../utils/swissknife";

import config from "../config";
const server_url = config["mongodb"]["uri"];

export class MongoConnection {
    private client: MongoClient;
    private logger: winston.Logger;
    db: Db | undefined;
    db_name: string;
    is_connected: boolean;
    version: string;
    dbtype: string;

    constructor(database_name: string) {
        this.client = new MongoClient(server_url, { useUnifiedTopology: true });
        this.is_connected = false;
        this.db_name = database_name;
        this.dbtype = "???";
        this.version = "X.XX.XX";
        this.logger = MainLogger.child({ cls: "MongoConnection" });
        this.connect();
    }

    connect() {
        this.logger.info(`connecting to ${this.db_name}...`);
        this.client
            .connect()
            .then(() => {
                this.db = this.client.db(this.db_name);
                this.is_connected = true;
                this.logger.info(`connected to ${this.db_name}.`);
                const admindb = this.db.admin();
                admindb.serverInfo((err, info) => {
                    this.version = info.version;
                    const modules = info.modules;
                    if (modules.length > 0) {
                        this.dbtype = modules[0];
                        this.dbtype = capitalizeIt(this.dbtype);
                    } else {
                        this.dbtype = "Community";
                    }
                });
            })
            .catch((error) => {
                this.logger.error(`Failed to connect to ${this.db_name}`);
                this.logger.error(error);
            });
    }

    open_collection(collection_name: string): Promise<any[]> {
        let cb_func;
        if (is_none(this.db)) {
            this.connect();
            // @ts-ignore
            const collection = this.db.collection(collection_name);
            cb_func = collection.find().toArray();
        } else {
            const collection = this.db.collection(collection_name);
            cb_func = collection.find().toArray();
        }
        return cb_func;
    }

    getCollection(collection_name: string) {
        while (!this.is_connected) {
            if (this.is_connected) {
                break;
            }
        }
        if (is_none(this.db)) {
            return;
        }
        return this.db.collection(collection_name);
    }

    async update_collection(collection_name: string, collection_data: any) {
        while (!this.is_connected || is_none(this.db)) {
            if (this.is_connected || !is_none(this.db)) {
                break;
            }
        }

        if (is_none(this.db)) {
            this.connect();
        }
        // @ts-ignore
        const collection = this.db.collection(collection_name);
        const callback_func = collection.updateOne({}, collection_data);
        await callback_func;
    }
}
