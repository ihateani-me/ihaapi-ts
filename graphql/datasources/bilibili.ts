import { MongoDataSource } from 'apollo-datasource-mongodb'
import _ from 'lodash';
import moment from "moment-timezone";
import { B2ChannelDoc, B2ChannelProps, B2VideoDoc, B2VideoProps } from '../../dbconn/models';
import { GroupsResults } from '../../utils/models';
import { is_none } from '../../utils/swissknife';
import { ChannelStatistics } from '../schemas/vtapi';

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

interface BiliBiliDocument<T> {
    [channel_name: string]: T
}

export class BiliBiliLive extends MongoDataSource<B2VideoDoc> {
    async getLive(status: string, channel_ids: string[] = null, groups: string[] = null) {
        let lookbackMax = moment.tz("UTC").unix() - (24 * 3600);
        let fetchFormat = {
            "status": {"$eq": status},
            "$or": [{"endTime": {"$gte": lookbackMax}}, {"endTime": {"$type": "null"}}],
        };
        if (!is_none(channel_ids) && Array.isArray(channel_ids) && channel_ids.length > 0) {
            fetchFormat["channel_id"] = {"$in": channel_ids};
        }
        if (!is_none(groups) && Array.isArray(groups) && groups.length > 0) {
            fetchFormat["group"] = {"$in": groups};
        }
        // @ts-ignore
        const livesData: B2VideoProps[] = await this.model.find(fetchFormat);
        return livesData;
    }
}

export class BiliBiliChannel extends MongoDataSource<B2ChannelDoc> {
    async getChannels(channel_ids: string[] = null, groups: string[] = null) {
        let fetchFormat = {};
        if (!is_none(channel_ids) && Array.isArray(channel_ids) && channel_ids.length > 0) {
            fetchFormat["id"] = {"$in": channel_ids};
        }
        if (!is_none(groups) && Array.isArray(groups) && groups.length > 0) {
            fetchFormat["group"] = {"$in": groups};
        }
        // @ts-ignore
        const channelsData: B2ChannelProps[] = await this.model.find(fetchFormat);
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
                    "subscriberCount": 1,
                    "videoCount": 1,
                    "viewCount": 1
                }
            }
        ])
        let mapping: BiliBiliDocument<ChannelStatistics> = {}
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
