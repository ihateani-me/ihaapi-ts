import { group } from "console";
import moment from "moment-timezone";
import { MongoClient, Db } from "mongodb";
import winston from "winston";
import { logger as MainLogger } from "../utils/logger";
import { capitalizeIt } from "../utils/swissknife";
import { TWCastChannelProps, TWCastVideoProps, TwitcastingChannel, TwitcastingVideo } from "./models/twitcasting";
import { TTVChannelProps, TTVVideoProps, TwitchChannel, TwitchVideo } from "./models/twitch";
import { YoutubeChannel, YoutubeVideo, YTChannelProps, YTVideoProps } from "./models/youtube";
const server_url = process.env.MONGODB_URI;

const ONE_HOUR = 36E2;

function removeUnnecessaryKeys(data: any[]): any[] {
    let remapped = data.map((res) => {
        try {
            delete res["_id"];
        } catch (e) {};
        try {
            delete res["__v"];
        } catch (e) {};
        return res;
    });
    return remapped;
}

export class VTDB {
    static async fetchVideos(source: string, groups?: string[], channelIds?: string[]) {
        let lookbackMax = moment.tz("UTC").unix() - (24 * ONE_HOUR);
        let requestFormat = {
            "status": {"$in": ["live", "upcoming", "past"]},
            "$or": [{"endTime": {"$gte": lookbackMax}}, {"endTime": {"$type": "null"}}],
        }
        if (Array.isArray(group) && group.length > 0) {
            requestFormat["group"] = {"$in": groups};
        }
        if (Array.isArray(channelIds) && channelIds.length > 0) {
            requestFormat["id"] = {"$in": channelIds};
        }
        if (source === "youtube") {
            // @ts-ignore
            let yt_res: YTVideoProps[] = await YoutubeVideo.find(requestFormat);
            let live_data: YTVideoProps[] = removeUnnecessaryKeys(yt_res.filter(res => res.status === "live"));
            let upcoming_data: YTVideoProps[] = removeUnnecessaryKeys(yt_res.filter(res => res.status === "upcoming"));
            let past_data: YTVideoProps[] = removeUnnecessaryKeys(yt_res.filter(res => res.status === "past"));
            return [live_data, upcoming_data, past_data];
        } else if (source === "bilibili") {
            return [[], [], []];
        } else if (source === "twitch") {
            // @ts-ignore
            let ttv_res: TTVVideoProps[] = await TwitchVideo.find(requestFormat);
            let live_data: TTVVideoProps[] = removeUnnecessaryKeys(ttv_res.filter(res => res.status === "live"));
            let upcoming_data: TTVVideoProps[] = removeUnnecessaryKeys(ttv_res.filter(res => res.status === "upcoming"));
            let past_data: TTVVideoProps[] = removeUnnecessaryKeys(ttv_res.filter(res => res.status === "past"));
            return [live_data, upcoming_data, past_data];
        } else if (source === "twitcasting") {
            // @ts-ignore
            let tw_res: TWCastVideoProps[] = await TwitcastingVideo.find(requestFormat);
            let live_data: TWCastVideoProps[] = removeUnnecessaryKeys(tw_res.filter(res => res.status === "live"));
            let upcoming_data: TWCastVideoProps[] = removeUnnecessaryKeys(tw_res.filter(res => res.status === "upcoming"));
            let past_data: TWCastVideoProps[] = removeUnnecessaryKeys(tw_res.filter(res => res.status === "past"));
            return [live_data, upcoming_data, past_data];
        }
    }

    static async fetchChannels(source: string, groups?: string[], channelIds?: string[]) {
        let requestFormat = {}
        if (Array.isArray(group) && group.length > 0) {
            requestFormat["group"] = {"$in": groups};
        }
        if (Array.isArray(channelIds) && channelIds.length > 0) {
            requestFormat["id"] = {"$in": channelIds};
        }
        if (source === "youtube") {
            // @ts-ignore
            let yt_res: YTChannelProps[] = await YoutubeChannel.find(requestFormat)
            return yt_res;
        } else if (source === "bilibili") {
            return [];
        } else if (source === "twitch") {
            // @ts-ignore
            let ttv_res: TTVChannelProps[] = await TwitchChannel.find(requestFormat)
            return ttv_res;
        } else if (source === "twitcasting") {
            // @ts-ignore
            let tw_res: TWCastChannelProps[] = await TwitcastingChannel.find(requestFormat)
            return tw_res;
        }
    }
}

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
