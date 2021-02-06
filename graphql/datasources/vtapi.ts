import _ from "lodash";
import moment from "moment";

import { MongooseDataSources } from "./models";

import { ChannelsData, ChannelsProps, ChannelStatsHistData, ChannelStatsHistProps, VideoProps, VideosData } from "../../dbconn/models";
import { IPaginateOptions, IPaginateResults } from "../../dbconn/models/pagination";
import { GroupsResults } from "../../utils/models";
import { fallbackNaN } from "../../utils/swissknife";

interface IChannelsOptions {
    groups?: string[] | null
    channel_ids?: string[] | null
}

interface IVideoOptions extends IChannelsOptions {
    max_lookback?: number | null
    max_lookforward?: number | null
}

export class VTAPIVideos extends MongooseDataSources<typeof VideosData> {
    async getVideos(platforms: string[], status: string, opts?: IVideoOptions, pageOpts?: IPaginateOptions): Promise<IPaginateResults<VideoProps>> {
        let defaultsPageOpts: IPaginateOptions = {
            limit: 25,
            cursor: undefined,
            sortBy: "timedata.startTime",
            project: {
                "__v": 0
            }
        }
        let mergedPageOpts = Object.assign({}, defaultsPageOpts, pageOpts);
        let lookbackTime = fallbackNaN(parseInt, _.get(opts, "max_lookback", 24), 24);
        let groups = _.get(opts, "groups", []);
        let channelIds = _.get(opts, "channel_ids", []);
        let max_lookforward = fallbackNaN(parseInt, _.get(opts, "max_lookforward", undefined), undefined);
        if (!Array.isArray(groups)) {
            groups = [];
        }
        if (!Array.isArray(channelIds)) {
            channelIds = [];
        }
        if (lookbackTime < 1 || lookbackTime > 24) {
            lookbackTime = 24;
        }
        let lookbackMax = moment.tz("UTC").unix() - (lookbackTime * 3600);
        let fetchFormat = {
            "platform": { "$in": platforms },
            "status": { "$eq": status },
            "$or": [{ "timedata.endTime": { "$gte": lookbackMax } }, { "timedata.endTime": { "$type": "null" } }],
        };
        if (channelIds.length > 0) {
            fetchFormat["channel_id"] = { "$in": channelIds };
        }
        if (groups.length > 0) {
            fetchFormat["group"] = { "$in": groups };
        }
        if (typeof max_lookforward === "number") {
            fetchFormat["timedata.scheduledStartTime"] = {"$lte": max_lookforward};
        }
        // @ts-ignore
        const livesData = await this.model.paginate(fetchFormat, mergedPageOpts);
        return livesData;
    }
}

export class VTAPIChannels extends MongooseDataSources<typeof ChannelsData> {
    async getChannels(platforms: string[], opts?: IChannelsOptions, pageOpts?: IPaginateOptions): Promise<IPaginateResults<ChannelsProps>> {
        let defaultsPageOpts: IPaginateOptions = {
            limit: 25,
            cursor: undefined,
            sortBy: "publishedAt",
            project: {
                "__v": 0
            }
        }
        let mergedPageOpts = Object.assign({}, defaultsPageOpts, pageOpts);
        let groups = _.get(opts, "groups", []);
        let channelIds = _.get(opts, "channel_ids", []);
        if (!Array.isArray(groups)) {
            groups = [];
        }
        if (!Array.isArray(channelIds)) {
            channelIds = [];
        }
        let fetchFormat = {"platform": { "$in": platforms }};
        if (channelIds.length > 0) {
            fetchFormat["id"] = { "$in": channelIds };
        }
        if (groups.length > 0) {
            fetchFormat["group"] = { "$in": groups };
        }
        // @ts-ignore
        const channelsData = await this.model.paginate(fetchFormat, mergedPageOpts);
        return channelsData;        
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

export class VTAPIChannelStatsHist extends MongooseDataSources<typeof ChannelStatsHistData> {
    async getChannelHistory(channel_id: string): Promise<ChannelStatsHistProps> {
        let historyReq = [
            {
                "$match": {
                    "id": {"$eq": channel_id}
                }
            },
            {
                "$project": {
                    "id": 1,
                    "history": 1,
                }
            }
        ]
        let raw_results = await this.model.aggregate(historyReq);
        return _.nth(raw_results, 0);
    }
}