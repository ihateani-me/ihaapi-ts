import { MongoClient, Db } from "mongodb";
import { capitalizeIt } from "../utils/swissknife";
const server_url = process.env.MONGODB_URI;

class VTBDB {
    private client: MongoClient;
    private db: Db
    db_name: string;
    is_connected: boolean;
    version: string;
    dbtype: string;

    constructor(database_name: string) {
        this.client = new MongoClient(server_url, { useUnifiedTopology: true });
        this.is_connected = false;
        this.db_name = database_name;
        console.log(`[db] connecting to ${this.db_name}...`);
        this.client.connect()
        .then(client => {
            this.db = this.client.db(database_name);
            this.is_connected = true;
            console.log(`[db] connected to ${this.db_name}.`);
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
            console.error(`[db] Failed to connect to ${this.db_name}`);
            console.error(error);
        });
    }

    open_collection(collection_name: string): Promise<any[]> {
        if (!this.is_connected) {
            this.client.connect()
            .then(client => {
                this.db = this.client.db(this.db_name);
                this.is_connected = true;
                console.log(`[db] connected to ${this.db_name}.`);
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
                console.error(`[db] Failed to connect to ${this.db_name}`);
                console.error(error);
            });
        }
        const collection = this.db.collection(collection_name);
        let callback_func = collection.find().toArray();
        return callback_func;
    }
}

export { VTBDB };