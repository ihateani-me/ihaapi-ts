import _ from "lodash";
import { DateTime } from "luxon";

import { MongooseDataSources } from "./models";

import { fallbackNaN } from "../../utils/swissknife";
import { Channels, ChannelStats, Video } from "../../controller/models";
import { IPaginateOptions, IPaginateResults } from "../../controller/models/pagination";

interface IChannelsOptions {
    groups?: string[] | null;
    channel_ids?: string[] | null;
}

interface IVideoOptions extends IChannelsOptions {
    id?: string[] | null;
    max_lookback?: number | null;
    max_lookforward?: number | null;
    is_mention_check?: boolean;
}

export interface GroupsResults {
    group: string;
}

export class VTAPIVideos extends MongooseDataSources<typeof Video> {
    async getVideos(
        platforms: string[],
        status: string | string[],
        opts?: IVideoOptions,
        pageOpts?: IPaginateOptions
    ): Promise<IPaginateResults<Video>> {
        const defaultsPageOpts: IPaginateOptions = {
            limit: 25,
            cursor: undefined,
            sortBy: "timedata.startTime",
            project: {
                __v: 0,
            },
        };
        const mergedPageOpts = Object.assign({}, defaultsPageOpts, pageOpts);
        let lookbackTime = fallbackNaN(parseInt, _.get(opts, "max_lookback", 24), 24) as number;
        let groups = _.get(opts, "groups", []);
        let channelIds = _.get(opts, "channel_ids", []);
        let videoIds = _.get(opts, "id", []);
        const max_lookforward = fallbackNaN(parseInt, _.get(opts, "max_lookforward", undefined), undefined);
        if (!Array.isArray(groups)) {
            groups = [];
        }
        let properStatus = [];
        if (Array.isArray(status)) {
            properStatus = status;
        } else if (typeof status === "string") {
            properStatus.push(status);
        }
        if (!Array.isArray(channelIds)) {
            channelIds = [];
        }
        if (!Array.isArray(videoIds)) {
            videoIds = [];
        }
        videoIds = videoIds.filter((e) => typeof e === "string");
        if (lookbackTime < 1 || lookbackTime > 24) {
            lookbackTime = 24;
        }
        const lookbackMax = DateTime.utc().toUnixInteger() - lookbackTime * 3600;
        const fetchFormat: any = {
            platform: { $in: platforms },
            status: { $in: properStatus },
        };
        if (!properStatus.includes("video") && !opts?.is_mention_check) {
            fetchFormat["$or"] = [
                { "timedata.endTime": { $gte: lookbackMax } },
                { "timedata.endTime": { $type: "null" } },
            ];
        }
        if (videoIds.length > 0) {
            fetchFormat["id"] = { $in: videoIds };
        }
        if (channelIds.length > 0) {
            fetchFormat["channel_id"] = { $in: channelIds };
        }
        if (groups.length > 0) {
            fetchFormat["group"] = { $in: groups };
        }
        if (typeof max_lookforward === "number") {
            fetchFormat["timedata.scheduledStartTime"] = { $lte: max_lookforward };
        }
        const livesData = await this.model.paginate(fetchFormat, mergedPageOpts);
        return livesData;
    }
}

export class VTAPIChannels extends MongooseDataSources<typeof Channels> {
    async getChannels(
        platforms: string[],
        opts?: IChannelsOptions,
        pageOpts?: IPaginateOptions
    ): Promise<IPaginateResults<Channels>> {
        const defaultsPageOpts: IPaginateOptions = {
            limit: 25,
            cursor: undefined,
            sortBy: "publishedAt",
            project: {
                __v: 0,
            },
        };
        const mergedPageOpts = Object.assign({}, defaultsPageOpts, pageOpts);
        let groups = _.get(opts, "groups", []);
        let channelIds = _.get(opts, "channel_ids", []);
        if (!Array.isArray(groups)) {
            groups = [];
        }
        if (!Array.isArray(channelIds)) {
            channelIds = [];
        }
        const fetchFormat: any = { platform: { $in: platforms } };
        if (channelIds.length > 0) {
            fetchFormat["id"] = { $in: channelIds };
        }
        if (groups.length > 0) {
            fetchFormat["group"] = { $in: groups };
        }
        const channelsData = await this.model.paginate(fetchFormat, mergedPageOpts);
        return channelsData;
    }

    async getGroups(): Promise<string[]> {
        const groups_results: GroupsResults[] = await this.model
            .aggregate([
                {
                    $project: {
                        group: 1,
                    },
                },
            ])
            .exec();
        return _.uniq(_.map(groups_results, "group"));
    }
}

export class VTAPIChannelStatsHist extends MongooseDataSources<typeof ChannelStats> {
    async getChannelHistory(channel_id: string, platform: string): Promise<ChannelStats> {
        const historyReq = [
            {
                $match: {
                    id: { $eq: channel_id },
                    platform: { $eq: platform },
                },
            },
            {
                $project: {
                    id: 1,
                    history: 1,
                },
            },
        ];
        const raw_results = await this.model.aggregate(historyReq).exec();
        return _.nth(raw_results, 0);
    }
}
