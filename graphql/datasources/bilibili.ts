import { MongoDataSource } from 'apollo-datasource-mongodb'
import { ObjectID } from "mongodb";
import { is_none } from '../../utils/swissknife';

export interface BiliBiliLive {
    id: string
    room_id: number
    title: string
    startTime: number
    channel?: string
    channel_id: string
    thumbnail?: string
    viewers?: number
    peakViewers?: number
    group?: string
    platform: string
}

export interface BiliBiliChannel {
    id: string
    room_id: string
    name: string
    description: string
    thumbnail: string
    subscriberCount: number
    viewCount: number
    videoCount: number
    live: boolean
    group?: string
    platform: string
}

interface BiliBiliDocument {
    _id: ObjectID
    live: BiliBiliLive[]
    upcoming: BiliBiliLive[]
    channels: BiliBiliChannel[]
}

export class BiliBili extends MongoDataSource<BiliBiliDocument> {
    async getChannels(user_id: string[]) {
        let raw_results = await this.collection.aggregate([{"$project": {"channels": 1}}]).toArray();
        let results = raw_results[0];
        let proper_results: BiliBiliChannel[] = [];
        if (!is_none(user_id) && user_id.length > 0) {
            for (let i = 0; i < results["channels"].length; i++) {
                const element = results["channels"][i];
                if (user_id.includes(element["id"])) {
                    proper_results.push(element);
                }
            }
        } else {
            proper_results = results["channels"];
        }
        return proper_results;
    }

    async getLive(user_id: string[]) {
        let raw_results = await this.collection.aggregate([{"$project": {"live": 1}}]).toArray();
        let results = raw_results[0];
        let proper_results: BiliBiliLive[] = [];
        if (!is_none(user_id) && user_id.length > 0) {
            for (let i = 0; i < results["live"].length; i++) {
                const element = results["live"][i];
                if (user_id.includes(element["id"])) {
                    proper_results.push(element);
                }
            }
        } else {
            proper_results = results["live"];
        }
        return proper_results;
    }

    async getUpcoming(user_id: string[]) {
        let raw_results = await this.collection.aggregate([{"$project": {"upcoming": 1}}]).toArray();
        let results = raw_results[0]
        let proper_results: BiliBiliLive[] = [];
        if (!is_none(user_id) && user_id.length > 0) {
            for (let i = 0; i < results["upcoming"].length; i++) {
                const element = results["upcoming"][i];
                if (user_id.includes(element["id"])) {
                    proper_results.push(element);
                }
            }
        } else {
            proper_results = results["upcoming"];
        }
        return proper_results;
    }
}