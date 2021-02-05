import winston from "winston";
import { MongoClient, Db } from "mongodb";

import { logger as MainLogger } from "../utils/logger";
import { capitalizeIt } from "../utils/swissknife";
const server_url = process.env.MONGODB_URI;

export class MongoConnection {
    private client: MongoClient;
    private logger: winston.Logger;
    db: Db
    db_name: string;
    is_connected: boolean;
    version: string;
    dbtype: string;

    constructor(database_name: string) {
        this.client = new MongoClient(server_url, { useUnifiedTopology: true });
        this.is_connected = false;
        this.db_name = database_name;
        this.logger = MainLogger.child({cls: "MongoConnection"});
        this.connect();
    }

    connect() {
        this.logger.info(`connecting to ${this.db_name}...`);
        this.dbtype = "???";
        this.version = "X.XX.XX"
        this.client.connect()
        .then(client => {
            this.db = this.client.db(this.db_name);
            this.is_connected = true;
            this.logger.info(`connected to ${this.db_name}.`);
            var admindb = this.db.admin();
            admindb.serverInfo((err, info) => {
                this.version = info.version;
                let modules = info.modules;
                if (modules.length > 0) {
                    this.dbtype = modules[0];
                    this.dbtype = capitalizeIt(this.dbtype);
                } else {
                    this.dbtype = "Community";
                }
            })
        })
        .catch((error) => {
            this.logger.error(`Failed to connect to ${this.db_name}`);
            this.logger.error(error);
        });
    }

    open_collection(collection_name: string): Promise<any[]> {
        if (!this.is_connected) {
            this.connect();
            const collection = this.db.collection(collection_name);
            var callback_func = collection.find().toArray();
        } else {
            const collection = this.db.collection(collection_name);
            var callback_func = collection.find().toArray();
        }
        return callback_func;
    }

    getCollection(collection_name: string) {
        while (!this.is_connected) {
            if (this.is_connected) {
                break;
            }
        }
        return this.db.collection(collection_name);
    }
    
    async update_collection(collection_name: string, collection_data: any) {
        if (!this.is_connected) {
            this.connect();
            const collection = this.db.collection(collection_name);
            var callback_func = collection.updateOne({}, collection_data);
        } else {
            const collection = this.db.collection(collection_name);
            var callback_func = collection.updateOne({}, {
                $set: collection_data
            });
        }
        await callback_func;
    }
}
