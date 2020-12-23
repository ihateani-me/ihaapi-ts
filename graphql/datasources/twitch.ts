import { MongoDataSource } from 'apollo-datasource-mongodb'
import moment from "moment-timezone";
import { TTVChannelDocs, TTVChannelProps, TTVVideoDocs, TTVVideoProps } from '../../dbconn/models';
import { is_none } from '../../utils/swissknife';
import { ChannelStatistics } from '../schemas/vtapi';

export interface TwitchLiveData {
    id: string
    title: string
    startTime: number
    channel: string
    channel_id: number
    thumbnail: string
    viewers: number
    peakViewers: number
    group: string
    platform: string
}

export class TwitchLive extends MongoDataSource<TTVVideoDocs> {
    async getLive(status: string, channel_ids: string[] = null, groups: string[] = null) {
        let lookbackMax = moment.tz("UTC").unix() - (24 * 3600);
        let fetchFormat = {
            "status": {"$eq": status},
            "$or": [{"timedata.endTime": {"$gte": lookbackMax}}, {"timedata.endTime": {"$type": "null"}}],
        };
        if (!is_none(channel_ids) && Array.isArray(channel_ids) && channel_ids.length > 0) {
            fetchFormat["channel_id"] = {"$in": channel_ids};
        }
        if (!is_none(groups) && Array.isArray(groups) && groups.length > 0) {
            fetchFormat["group"] = {"$in": groups};
        }
        // @ts-ignore
        const livesData: TTVVideoProps[] = await this.model.find(fetchFormat);
        return livesData;
    }
}

export interface TwitchChannelData {
    id: string
    user_id: string
    name: string
    description: string
    thumbnail: string
    publishedAt: string
    followerCount: number
    viewCount: number
    group: string
    platform: string
}

export interface TwitchChannelDocument<T> {
    [channel_name: string]: T
}

export class TwitchChannel extends MongoDataSource<TTVChannelDocs> {
    async getChannels(channel_ids: string[] = null, groups: string[] = null) {
        let fetchFormat = {};
        if (!is_none(channel_ids) && Array.isArray(channel_ids) && channel_ids.length > 0) {
            fetchFormat["id"] = {"$in": channel_ids};
        }
        if (!is_none(groups) && Array.isArray(groups) && groups.length > 0) {
            fetchFormat["group"] = {"$in": groups};
        }
        // @ts-ignore
        const channelsData: TTVChannelProps[] = await this.model.find(fetchFormat);
        return channelsData;
    }

    async getChannelStats(channel_ids: string[]) {
        let raw_results = await this.model.aggregate([
            {
                "$match": {
                    "id": {"$in": channel_ids}
                },
                "$project": {
                    "id": 1,
                    "followerCount": 1,
                    "videoCount": 1,
                    "viewCount": 1
                }
            }
        ])
        let mapping: TwitchChannelDocument<ChannelStatistics> = {}
        raw_results.forEach((channel_data) => {
            mapping[channel_data["id"]] = {
                "subscriberCount": channel_data["followerCount"],
                "videoCount": channel_data["videoCount"],
                "viewCount": channel_data["viewCount"],
                "level": null,
            }
        })
        return mapping;
    }
}
