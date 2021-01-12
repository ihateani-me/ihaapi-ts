import { MongoDataSource } from 'apollo-datasource-mongodb';
import _ from 'lodash';
import moment from "moment-timezone";
import { YTChannelDocs, YTChannelProps, YTVideoDocs, YTVideoProps } from '../../dbconn/models/youtube';
import { GroupsResults } from '../../utils/models';
import { is_none } from '../../utils/swissknife';
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

export class YoutubeLive extends MongoDataSource<YTVideoDocs> {
    async getLive(status: string, channel_ids: string[] = null, groups: string[] = null) {
        let lookbackMax = moment.tz("UTC").unix() - (24 * 3600);
        let fetchFormat = {
            "status": { "$eq": status },
            "$or": [{ "timedata.endTime": { "$gte": lookbackMax } }, { "timedata.endTime": { "$type": "null" } }],
        };
        if (!is_none(channel_ids) && Array.isArray(channel_ids) && channel_ids.length > 0) {
            fetchFormat["channel_id"] = { "$in": channel_ids };
        }
        if (!is_none(groups) && Array.isArray(groups) && groups.length > 0) {
            fetchFormat["group"] = { "$in": groups };
        }
        // @ts-ignore
        const livesData: YTVideoProps[] = await this.model.find(fetchFormat);
        return livesData;
    }
}

export class YoutubeChannel extends MongoDataSource<YTChannelDocs> {
    async getChannel(channel_ids: string[] = null, groups: string[] = null) {
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
        const channelsData: YTChannelProps[] = await this.model.aggregate(aggregateReq);
        return channelsData;
    }

    async getChannelStats(channel_ids: string[]) {
        let raw_results = await this.model.aggregate([
            {
                "$match": {
                    "id": { "$in": channel_ids }
                },
                "$project": {
                    "id": 1,
                    "subscriberCount": 1,
                    "videoCount": 1,
                    "viewCount": 1
                }
            }
        ])
        let mapping: YoutubeDocument<ChannelStatistics> = {}
        raw_results.forEach((channel_data) => {
            mapping[channel_data["id"]] = {
                "subscriberCount": channel_data["subscriberCount"],
                "videoCount": channel_data["videoCount"],
                "viewCount": channel_data["viewCount"],
                "level": null,
            }
        })
        return mapping;
    }

    async getChannelHistory(channel_id: string): Promise<YTChannelProps> {
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

    async getGroups(): Promise<string[]> {
        let groups_results: GroupsResults[] = await this.model.aggregate([
            {
                "$project": {
                    "group": 1,
                }
            }
        ])
        return _.uniq(_.map(groups_results, "group"));
    }
}