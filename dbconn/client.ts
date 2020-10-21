import { MongoClient, Db } from "mongodb";
const server_url = process.env.MONGODB_URI;

class VTBDB {
    private client: MongoClient;
    private db: Db
    is_connected: boolean;
    version: string;
    dbtype: string;

    constructor(database_name: string) {
        this.client = new MongoClient(server_url, { useUnifiedTopology: true });
        this.is_connected = false;
        console.log(`[db] connecting to ${database_name}...`);
        this.client.connect()
        .then(client => {
            this.db = this.client.db(database_name);
            this.is_connected = true;
            console.log(`[db] connected to ${database_name}.`);
            var admindb = this.db.admin();
            admindb.serverInfo((err, info) => {
                this.version = info.version;
                let modules = info.modules;
                if (modules.length > 0) {
                    this.dbtype = modules[0];
                    this.dbtype = this.dbtype[0].toUpperCase() + this.dbtype.slice(1);
                } else {
                    this.dbtype = "Community";
                }
            })
        });
    }

    open_collection(collection_name: string): Promise<any[]> {
        const collection = this.db.collection(collection_name);
        let callback_func = collection.find().toArray();
        return callback_func;
    }
}

export { VTBDB };