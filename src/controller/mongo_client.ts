import winston from "winston";
import { Db, MongoClient } from "mongodb";

import { logger as MainLogger } from "../utils/logger";
import { capitalizeIt, is_none } from "../utils/swissknife";

import config from "../config";
import { MongoClientOptions } from "mongodb";
const server_url = config["mongodb"]["uri"];

export class MongoConnection {
    private client: MongoClient;
    private logger: winston.Logger;
    db?: Db;
    db_name: string;
    is_connected: boolean;
    version: string;
    dbtype: string;

    constructor(database_name: string, auto_connect = true) {
        const mongoConf: MongoClientOptions = {
            authSource: "admin",
        };
        if (config.mongodb.replica_set) {
            mongoConf.replicaSet = config.mongodb.replica_set;
            mongoConf.directConnection = true;
            mongoConf.readPreference = "primary";
        }
        this.client = new MongoClient(server_url, mongoConf);
        this.is_connected = false;
        this.db_name = database_name;
        this.dbtype = "???";
        this.version = "X.XX.XX";
        this.logger = MainLogger.child({ cls: "MongoConnection" });
        if (auto_connect) {
            this.connect();
        }
    }

    connect() {
        this.logger.info(`connecting to ${this.db_name} (${server_url})...`);
        this.client
            .connect()
            .then(() => {
                this.db = this.client.db(this.db_name);
                this.is_connected = true;
                this.logger.info(`connected to ${this.db_name}.`);
                const admindb = this.db.admin();
                admindb.serverInfo().then((info) => {
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
        if (is_none(this.db)) {
            this.connect();
        }
        const collection = this.db?.collection(collection_name);
        const cb_func = collection?.find().toArray();
        return cb_func ?? new Promise<any[]>((resolve) => resolve([]));
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
