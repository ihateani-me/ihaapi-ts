import { MongoDataSource } from 'apollo-datasource-mongodb';
import { ChannelStatistics } from "../schemas/vtapi";

export interface YoutubeLiveData {
    id: string
    title: string
    startTime: number
    endTime?: number
    channel?: string
    channel_id: string
    thumbnail: string
    viewers?: number
    peakViewers?: number
    status: string
    group: string
    platform: string
}

export interface YoutubeChannelData {
    id: string
    name: string
    description: string
    publishedAt: string
    thumbnail: string
    group: string
    subscriberCount: number
    viewCount: number
    videoCount: number
    platform: string
}

export interface YoutubeDocument<T> {
    [channel_id: string]: T
}

export class YoutubeLive extends MongoDataSource<YoutubeDocument<YoutubeLiveData[]>> {
    async getLive(channel_ids: string[] = null) {
        let generate_aggreate = {};
        if (channel_ids) {
            for (let i = 0; i < channel_ids.length; i++) {
                const e = channel_ids[i];
                generate_aggreate[e] = 1;
            }
        }
        if (channel_ids) {
            let results = await this.collection.aggregate([{"$project": generate_aggreate}]).toArray();
            let main_res = results[0];
            try {
                delete main_res["_id"];
            } catch (e) {}
            return main_res;
        } else {
            let results = await this.collection.find().toArray();
            let main_res = results[0];
            try {
                delete main_res["_id"];
            } catch (e) {}
            return main_res;
        }
    }
}

export class YoutubeChannel extends MongoDataSource<YoutubeDocument<YoutubeChannelData>, YoutubeDocument<ChannelStatistics>> {
    async getChannel(channel_ids: string[] = null) {
        let generate_aggreate = {};
        if (channel_ids) {
            for (let i = 0; i < channel_ids.length; i++) {
                const e = channel_ids[i];
                generate_aggreate[e] = 1;
            }
        }
        if (channel_ids) {
            let results = await this.collection.aggregate([{"$project": generate_aggreate}]).toArray();
            let main_res = results[0];
            try {
                delete main_res["_id"];
            } catch (e) {}
            return main_res;
        } else {
            let results = await this.collection.find().toArray();
            let main_res = results[0];
            try {
                delete main_res["_id"];
            } catch (e) {}
            return main_res;
        }
    }

    async getChannelStats(channel_ids: string[]) {
        let generate_aggreate = {};
        for (let i = 0; i < channel_ids.length; i++) {
            const e = channel_ids[i];
            generate_aggreate[e] = 1;
        }
        let raw_results = await this.collection.aggregate([{"$project": generate_aggreate}]).toArray();
        let results = raw_results[0];
        let mapping: YoutubeDocument<ChannelStatistics> = {}
        for (let [channel_id, channel_data] of Object.entries(results)) {
            mapping[channel_id] = {
                "subscriberCount": channel_data["subscriberCount"],
                "videoCount": channel_data["videoCount"],
                "viewCount": channel_data["videoCount"],
            }
        }
        return mapping;
    }
}