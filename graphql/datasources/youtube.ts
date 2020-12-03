import { MongoDataSource } from 'apollo-datasource-mongodb'

interface YoutubeLiveData {
    id: string
    title: string
    startTime: number
    endTime?: number
    channel?: string
    channel_id: string
    viewers?: number
    peakViewers?: number
    status: string
    group: string
    platform: string
}

interface YoutubeChannelData {
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

interface YoutubeDocument<T> {
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
            return results[0];
        } else {
            let results = await this.collection.find().toArray();
            return results[0];
        }
    }
}

export class YoutubeChannel extends MongoDataSource<YoutubeDocument<YoutubeChannelData[]>> {
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
            return results[0];
        } else {
            let results = await this.collection.find().toArray();
            return results[0];
        }
    }
}