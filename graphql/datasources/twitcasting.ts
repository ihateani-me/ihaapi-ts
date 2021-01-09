import { MongoDataSource } from 'apollo-datasource-mongodb'
import _ from 'lodash';
import moment from "moment-timezone";
import { TWCastChannelDocs, TWCastChannelProps, TWCastVideoDocs, TWCastVideoProps } from '../../dbconn/models';
import { is_none } from '../../utils/swissknife';
import { ChannelStatistics } from '../schemas/vtapi';

export interface TwitcastingLiveData {
    id: string
    title: string
    startTime: number
    channel: string
    viewers: number
    peakViewers: number
    group: string
    platform: string
}

export class TwitcastingLive extends MongoDataSource<TWCastVideoDocs> {
    async getLive(status: string, channel_ids: string[] = null, groups: string[] = null) {
        let lookbackMax = moment.tz("UTC").unix() - (24 * 3600);
        let fetchFormat = {
            "status": {"$eq": status},
            "$or": [{"timedata.endTime": {"$gte": lookbackMax}}, {"timedata.endTime": {"$type": "null"}}],
        };
        if (!is_none(channel_ids) && Array.isArray(channel_ids) && channel_ids.length > 0) {
            fetchFormat["channel_id"] = {"$in": channel_ids};
        }
        if (!is_none(channel_ids) && Array.isArray(groups) && channel_ids.length > 0) {
            fetchFormat["group"] = {"$in": groups};
        }
        // @ts-ignore
        const livesData: TWCastVideoProps[] = await this.model.find(fetchFormat);
        return livesData;
    }
}

export interface TwitcastingChannelData {
    id: string
    name: string
    description: string
    thumbnail: string
    followerCount: number
    level: number
    group: string
    platform: string
}

export interface TwitcastingDocument<T> {
    [channel_name: string]: T
}

export class TwitcastingChannel extends MongoDataSource<TWCastChannelDocs> {
    async getChannels(channel_ids: string[] = null, groups: string[] = null) {
        let matchFormat = {};
        if (!is_none(channel_ids) && Array.isArray(channel_ids) && channel_ids.length > 0) {
            matchFormat["id"] = { "$in": channel_ids };
        }
        if (!is_none(groups) && Array.isArray(groups) && groups.length > 0) {
            matchFormat["group"] = { "$in": groups };
        }
        let aggregateReq = [];
        if (Object.keys(matchFormat).length > 0) {
            aggregateReq.push({
                "$match": matchFormat
            })
        }
        // omit history because it's resource hog
        let projectFormat = {
            "_id": 0,
            "history": 0,
            "__v": 0
        }
        aggregateReq.push({
            "$project": projectFormat,
        })
        // @ts-ignore
        const channelsData: TWCastChannelProps[] = await this.model.aggregate(aggregateReq);
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
                    "level": 1
                }
            }
        ])
        let mapping: TwitcastingDocument<ChannelStatistics> = {}
        raw_results.forEach((channel_data) => {
            mapping[channel_data["id"]] = {
                "subscriberCount": channel_data["followerCount"],
                "level": channel_data["level"],
                "viewCount": null,
                "videoCount": null,
            }
        })
        return mapping;
    }

    async getChannelHistory(channel_id: string): Promise<TWCastChannelProps> {
        let raw_results = await this.model.aggregate([
            {
                "$match": {
                    "id": { "$eq": channel_id }
                },
                "$project": {
                    "id": 1,
                    "history": 1,
                }
            }
        ])
        return _.nth(raw_results, 0);
    }
}
