import _, { find } from "lodash";
import "apollo-cache-control";
import express from "express";
import moment from "moment-timezone";
import { ApolloError, IResolvers } from "apollo-server-express";

// Import models
import {
    ChannelGrowth,
    ChannelGrowthObject,
    ChannelObject,
    ChannelObjectParams,
    ChannelsResource,
    ChannelsStatsHistory,
    DateTimeScalar,
    GroupsResource,
    HistoryData,
    LiveObject,
    LiveObjectParams,
    LivesResource,
    LiveStatus,
    MutatedRemovedVTuber,
    PlatformName,
    SortOrder,
    VTAddMutationParams,
    VTMutationBase,
    VTRetiredMutationParams,
    VTSetNoteMutationParams,
} from "../schemas";
import { VTAPIDataSources } from "../datasources";

import { ChannelsData, ChannelsProps, VideoProps } from "../../controller/models";
import { CustomRedisCache } from "../caches/redis";
import { getGroup } from "../../utils/filters";
import {
    fallbackNaN,
    getValueFromKey,
    is_none,
    map_bool,
    Nullable,
    validateListData,
} from "../../utils/swissknife";
import { logger as TopLogger } from "../../utils/logger";
import { IPaginateOptions, IPaginateResults } from "../../controller/models/pagination";
import { VTuberMutation } from "../mutations";

import config from "../../config";

const MainLogger = TopLogger.child({ cls: "GQLVTuberAPI" });

const ONE_DAY = 864e2;
const ONE_WEEK = 604800;
interface ChannelParents {
    platform?: PlatformName;
    group?: string;
    channel_id?: string[];
    type: "stats" | "channel";
    force_single?: boolean;
}

interface VTAPIContext {
    req: express.Request;
    res: express.Response;
    cacheServers: CustomRedisCache;
    dataSources: VTAPIDataSources;
}

interface HistoryGrowthData {
    timestamp: number;
    subscriberCount?: number;
    viewCount?: number;
    videoCount?: number;
    followerCount?: number;
    level?: number;
}

function fallbackGrowthMakeSure(historyData?: HistoryGrowthData): HistoryGrowthData {
    if (typeof historyData === "undefined") {
        return {
            timestamp: -1,
            subscriberCount: undefined,
            viewCount: undefined,
            videoCount: undefined,
            followerCount: undefined,
            level: undefined,
        };
    }
    const ts = _.get(historyData, "timestamp", -1);
    const sC = _.get(historyData, "subscriberCount", undefined);
    const vC = _.get(historyData, "viewCount", undefined);
    const vdC = _.get(historyData, "videoCount", undefined);
    const fC = _.get(historyData, "followerCount", undefined);
    const lC = _.get(historyData, "level", undefined);
    return {
        timestamp: ts,
        subscriberCount: sC,
        viewCount: vC,
        videoCount: vdC,
        followerCount: fC,
        level: lC,
    };
}

function fallbackGrowthIfNaN(growth: ChannelGrowth): ChannelGrowth {
    let oD = _.get(growth, "oneDay", NaN);
    let oW = _.get(growth, "oneWeek", NaN);
    let tW = _.get(growth, "twoWeeks", NaN);
    let oM = _.get(growth, "oneMonth", NaN);
    let sM = _.get(growth, "sixMonths", NaN);
    let oY = _.get(growth, "oneYear", NaN);
    const ts = _.get(growth, "lastUpdated", -1);
    oD = isNaN(oD) ? 0 : oD;
    oW = isNaN(oW) ? 0 : oW;
    tW = isNaN(tW) ? 0 : tW;
    oM = isNaN(oM) ? 0 : oM;
    sM = isNaN(sM) ? 0 : sM;
    oY = isNaN(oY) ? 0 : oY;
    return {
        oneDay: oD,
        oneWeek: oW,
        twoWeeks: tW,
        oneMonth: oM,
        sixMonths: sM,
        oneYear: oY,
        lastUpdated: ts,
    };
}

function mapHistoryData(
    platform: PlatformName,
    channelId: string,
    historyData?: HistoryGrowthData[]
): Nullable<ChannelsStatsHistory> {
    const logger = MainLogger.child({ fn: "mapGrowthData" });
    if (typeof historyData === "undefined") {
        return null;
    }
    if (_.isNull(historyData)) {
        return null;
    }
    if (historyData.length < 1) {
        logger.error(`history data is less than one, returning null for ${platform} ${channelId}`);
        return null;
    }
    const maxLookback = moment.tz("UTC").unix() - ONE_WEEK;

    const historyFiltered = historyData.filter((res) => res.timestamp >= maxLookback);
    // @ts-ignore
    const rawSubsData: HistoryData[] = historyFiltered.map((res) => {
        return {
            data: platform === "youtube" ? res.subscriberCount : res.followerCount,
            time: res.timestamp,
            sortKey: moment.unix(res.timestamp).format("MM/DD"),
        };
    });

    let rawVideosData: Nullable<HistoryData[]> = [];
    if (["youtube", "bilibili"].includes(platform)) {
        // @ts-ignore
        rawVideosData = historyFiltered.map((res) => {
            return {
                data: res.videoCount,
                time: res.timestamp,
                sortKey: moment.unix(res.timestamp).format("MM/DD"),
            };
        });
    }

    let rawViewsData: Nullable<HistoryData[]> = [];
    if (platform !== "twitcasting") {
        // @ts-ignore
        rawViewsData = historyFiltered.map((res) => {
            return {
                data: res.viewCount,
                time: res.timestamp,
                sortKey: moment.unix(res.timestamp).format("MM/DD"),
            };
        });
    }

    const groupedSubsData = _.groupBy(rawSubsData, "sortKey");
    const groupedViewsData = _.groupBy(rawViewsData, "sortKey");
    const groupedVideosData = _.groupBy(rawVideosData, "sortKey");

    const formattedSubsData: HistoryData[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_a, data] of Object.entries(groupedSubsData)) {
        formattedSubsData.push({
            time: data[data.length - 1].time,
            data: data[data.length - 1].data,
        });
    }

    const formattedViewsData: HistoryData[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_b, data] of Object.entries(groupedViewsData)) {
        formattedViewsData.push({
            time: data[data.length - 1].time,
            data: data[data.length - 1].data,
        });
    }

    const formattedVideosData: HistoryData[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_c, data] of Object.entries(groupedVideosData)) {
        formattedVideosData.push({
            time: data[data.length - 1].time,
            data: data[data.length - 1].data,
        });
    }

    return {
        subscribersCount: formattedSubsData,
        viewsCount: formattedViewsData,
        videosCount: formattedVideosData,
    };
}

function mapGrowthData(
    platform: PlatformName,
    channelId: string,
    historyData?: HistoryGrowthData[]
): Nullable<ChannelGrowthObject> {
    const logger = MainLogger.child({ fn: "mapGrowthData" });
    if (typeof historyData === "undefined") {
        return null;
    }
    if (_.isNull(historyData)) {
        return null;
    }
    const currentTime = moment.tz("UTC").unix();
    const oneDay = currentTime - ONE_DAY,
        oneWeek = currentTime - ONE_DAY * 7,
        twoWeeks = currentTime - ONE_DAY * 14,
        oneMonth = currentTime - ONE_DAY * 30,
        sixMonths = currentTime - ONE_DAY * 183,
        oneYear = currentTime - ONE_DAY * 365;

    if (historyData.length < 1) {
        logger.error(`history data is less than one, returning null for ${platform} ${channelId}`);
        return null;
    }

    const lookbackOneDay = _.sortBy(
        historyData.filter((res) => res.timestamp >= oneDay),
        (o) => o.timestamp
    );
    const lookbackOneWeek = _.sortBy(
        historyData.filter((res) => res.timestamp >= oneWeek),
        (o) => o.timestamp
    );
    const lookbackTwoWeeks = _.sortBy(
        historyData.filter((res) => res.timestamp >= twoWeeks),
        (o) => o.timestamp
    );
    const lookbackOneMonth = _.sortBy(
        historyData.filter((res) => res.timestamp >= oneMonth),
        (o) => o.timestamp
    );
    const lookbackSixMonths = _.sortBy(
        historyData.filter((res) => res.timestamp >= sixMonths),
        (o) => o.timestamp
    );
    const lookbackOneYear = _.sortBy(
        historyData.filter((res) => res.timestamp >= oneYear),
        (o) => o.timestamp
    );
    if (
        lookbackOneDay.length < 1 &&
        lookbackOneWeek.length < 1 &&
        lookbackTwoWeeks.length < 1 &&
        lookbackOneMonth.length < 1 &&
        lookbackSixMonths.length < 1 &&
        lookbackOneYear.length
    ) {
        logger.error(`missing all history data after filtering, returning null for ${platform} ${channelId}`);
        return null;
    }

    const oneDayStart = fallbackGrowthMakeSure(_.nth(lookbackOneDay, 0)),
        oneDayEnd = fallbackGrowthMakeSure(_.nth(lookbackOneDay, -1));
    const oneWeekStart = fallbackGrowthMakeSure(_.nth(lookbackOneWeek, 0)),
        oneWeekEnd = fallbackGrowthMakeSure(_.nth(lookbackOneWeek, -1));
    const twoWeeksStart = fallbackGrowthMakeSure(_.nth(lookbackTwoWeeks, 0)),
        twoWeeksEnd = fallbackGrowthMakeSure(_.nth(lookbackTwoWeeks, -1));
    const oneMonthStart = fallbackGrowthMakeSure(_.nth(lookbackOneMonth, 0)),
        oneMonthEnd = fallbackGrowthMakeSure(_.nth(lookbackOneMonth, -1));
    const sixMonthsStart = fallbackGrowthMakeSure(_.nth(lookbackSixMonths, 0)),
        sixMonthsEnd = fallbackGrowthMakeSure(_.nth(lookbackSixMonths, -1));
    const oneYearStart = fallbackGrowthMakeSure(_.nth(lookbackOneYear, 0)),
        oneYearEnd = fallbackGrowthMakeSure(_.nth(lookbackOneYear, -1));

    if (platform === "youtube") {
        const subsGrowth: ChannelGrowth = {
            // @ts-ignore: why
            oneDay: oneDayEnd["subscriberCount"] - oneDayStart["subscriberCount"],
            // @ts-ignore: why
            oneWeek: oneWeekEnd["subscriberCount"] - oneWeekStart["subscriberCount"],
            // @ts-ignore: why
            twoWeeks: twoWeeksEnd["subscriberCount"] - twoWeeksStart["subscriberCount"],
            // @ts-ignore: why
            oneMonth: oneMonthEnd["subscriberCount"] - oneMonthStart["subscriberCount"],
            // @ts-ignore: why
            sixMonths: sixMonthsEnd["subscriberCount"] - sixMonthsStart["subscriberCount"],
            // @ts-ignore: why
            oneYear: oneYearEnd["subscriberCount"] - oneYearStart["subscriberCount"],
            lastUpdated: oneDayEnd["timestamp"],
        };
        const viewsGrowth: ChannelGrowth = {
            // @ts-ignore: why
            oneDay: oneDayEnd["viewCount"] - oneDayStart["viewCount"],
            // @ts-ignore: why
            oneWeek: oneWeekEnd["viewCount"] - oneWeekStart["viewCount"],
            // @ts-ignore: why
            twoWeeks: twoWeeksEnd["viewCount"] - twoWeeksStart["viewCount"],
            // @ts-ignore: why
            oneMonth: oneMonthEnd["viewCount"] - oneMonthStart["viewCount"],
            // @ts-ignore: why
            sixMonths: sixMonthsEnd["viewCount"] - sixMonthsStart["viewCount"],
            // @ts-ignore: why
            oneYear: oneYearEnd["viewCount"] - oneYearStart["viewCount"],
            lastUpdated: oneDayEnd["timestamp"],
        };
        return {
            subscribersGrowth: fallbackGrowthIfNaN(subsGrowth),
            viewsGrowth: fallbackGrowthIfNaN(viewsGrowth),
        };
    } else if (platform === "twitcasting") {
        const subsGrowth: ChannelGrowth = {
            // @ts-ignore: why
            oneDay: oneDayEnd["followerCount"] - oneDayStart["followerCount"],
            // @ts-ignore: why
            oneWeek: oneWeekEnd["followerCount"] - oneWeekStart["followerCount"],
            // @ts-ignore: why
            twoWeeks: twoWeeksEnd["followerCount"] - twoWeeksStart["followerCount"],
            // @ts-ignore: why
            oneMonth: oneMonthEnd["followerCount"] - oneMonthStart["followerCount"],
            // @ts-ignore: why
            sixMonths: sixMonthsEnd["followerCount"] - sixMonthsStart["followerCount"],
            // @ts-ignore: why
            oneYear: oneYearEnd["followerCount"] - oneYearStart["followerCount"],
            // @ts-ignore: why
            lastUpdated: oneDayEnd["timestamp"],
        };
        return { subscribersGrowth: fallbackGrowthIfNaN(subsGrowth) };
    } else if (platform === "twitch") {
        const subsGrowth: ChannelGrowth = {
            // @ts-ignore: why
            oneDay: oneDayEnd["followerCount"] - oneDayStart["followerCount"],
            // @ts-ignore: why
            oneWeek: oneWeekEnd["followerCount"] - oneWeekStart["followerCount"],
            // @ts-ignore: why
            twoWeeks: twoWeeksEnd["followerCount"] - twoWeeksStart["followerCount"],
            // @ts-ignore: why
            oneMonth: oneMonthEnd["followerCount"] - oneMonthStart["followerCount"],
            // @ts-ignore: why
            sixMonths: sixMonthsEnd["followerCount"] - sixMonthsStart["followerCount"],
            // @ts-ignore: why
            oneYear: oneYearEnd["followerCount"] - oneYearStart["followerCount"],
            lastUpdated: oneDayEnd["timestamp"],
        };
        const viewsGrowth: ChannelGrowth = {
            // @ts-ignore: why
            oneDay: oneDayEnd["viewCount"] - oneDayStart["viewCount"],
            // @ts-ignore: why
            oneWeek: oneWeekEnd["viewCount"] - oneWeekStart["viewCount"],
            // @ts-ignore: why
            twoWeeks: twoWeeksEnd["viewCount"] - twoWeeksStart["viewCount"],
            // @ts-ignore: why
            oneMonth: oneMonthEnd["viewCount"] - oneMonthStart["viewCount"],
            // @ts-ignore: why
            sixMonths: sixMonthsEnd["viewCount"] - sixMonthsStart["viewCount"],
            // @ts-ignore: why
            oneYear: oneYearEnd["viewCount"] - oneYearStart["viewCount"],
            lastUpdated: oneDayEnd["timestamp"],
        };
        return {
            subscribersGrowth: fallbackGrowthIfNaN(subsGrowth),
            viewsGrowth: fallbackGrowthIfNaN(viewsGrowth),
        };
    } else if (platform === "bilibili") {
        return null;
    }
    return null;
}

function calcDuration(realDuration: number, startTime?: number, endTime?: number) {
    if (typeof realDuration === "number" && !isNaN(realDuration)) {
        return realDuration;
    }
    if (typeof startTime === "number" && typeof endTime === "number") {
        return endTime - startTime;
    }
    return null;
}

function setAsNaNAsNone(tocheck: Nullable<number>): Nullable<number> {
    if (is_none(tocheck)) {
        return null;
    }
    if (isNaN(tocheck)) {
        return null;
    }
    return tocheck;
}

class VTAPIQuery {
    logger = TopLogger.child({ cls: "VTAPIQuery" });

    private remapGroupsData(groups?: Nullable<any[]>) {
        if (is_none(groups)) {
            return null;
        }
        const allowedGroups = groups.map((group) => {
            const map: any[] = getGroup(group);
            if (is_none(map)) {
                return [group];
            }
            return map;
        });
        return _.uniq(_.flattenDeep(allowedGroups));
    }

    mapLiveResultToSchema(res: VideoProps): LiveObject {
        const timeObject = _.get(res, "timedata", {});
        const duration = calcDuration(
            _.get(timeObject, "duration", NaN),
            _.get(timeObject, "startTime", NaN),
            _.get(timeObject, "endTime", NaN)
        );
        const remapped: LiveObject = {
            id: res["id"],
            room_id: _.get(res, "room_id", null),
            title: res["title"],
            status: res["status"],
            timeData: {
                scheduledStartTime: is_none(_.get(timeObject, "scheduledStartTime", null))
                    ? null
                    : setAsNaNAsNone(_.get(timeObject, "scheduledStartTime")),
                startTime: is_none(_.get(timeObject, "startTime", null))
                    ? null
                    : setAsNaNAsNone(_.get(timeObject, "startTime")),
                endTime: is_none(_.get(timeObject, "endTime", null))
                    ? null
                    : setAsNaNAsNone(_.get(timeObject, "endTime")),
                duration: setAsNaNAsNone(duration),
                publishedAt: is_none(_.get(timeObject, "publishedAt", null))
                    ? null
                    : _.get(timeObject, "publishedAt"),
                lateBy: is_none(_.get(timeObject, "lateTime", null))
                    ? null
                    : setAsNaNAsNone(_.get(timeObject, "lateTime")),
            },
            channel_id: res["channel_id"],
            viewers: is_none(_.get(res, "viewers", null)) ? null : res["viewers"],
            peakViewers: is_none(_.get(res, "peakViewers", null)) ? null : res["peakViewers"],
            averageViewers: is_none(_.get(res, "averageViewers", null)) ? null : res["averageViewers"],
            thumbnail: res["thumbnail"],
            group: res["group"],
            platform: res["platform"],
            is_missing: is_none(_.get(res, "is_missing", null)) ? null : res["is_missing"],
            is_premiere: is_none(_.get(res, "is_premiere", null)) ? null : res["is_premiere"],
            is_member: is_none(_.get(res, "is_member", null)) ? null : res["is_member"],
        };
        return remapped;
    }

    mapChannelResultToSchema(res: ChannelsProps): ChannelObject {
        let subsCount = ["twitch", "twitcasting", "mildom"].includes(res["platform"])
            ? res["followerCount"]
            : res["subscriberCount"];
        subsCount = is_none(subsCount) ? 0 : subsCount;
        const remapped: ChannelObject = {
            id: res["id"],
            room_id: is_none(_.get(res, "room_id", null)) ? null : res["room_id"],
            user_id: is_none(_.get(res, "user_id", null)) ? null : res["user_id"],
            name: res["name"],
            en_name: res["en_name"],
            description: res["description"],
            publishedAt: is_none(res["publishedAt"]) ? null : res["publishedAt"],
            image: res["thumbnail"],
            group: res["group"],
            statistics: {
                subscriberCount: subsCount,
                viewCount: is_none(res["viewCount"]) ? null : res["viewCount"],
                videoCount: is_none(res["videoCount"]) ? null : res["videoCount"],
                level: is_none(res["level"]) ? null : res["level"],
            },
            is_live: is_none(res["is_live"]) ? null : res["is_live"],
            is_retired: is_none(res["is_retired"]) ? false : res["is_retired"],
            platform: res["platform"],
            extraNote: is_none(res["note"]) ? null : res["note"],
        };
        return remapped;
    }

    async performQueryOnLive(
        args: LiveObjectParams,
        type: LiveStatus | LiveStatus[],
        dataSources: VTAPIDataSources
    ): Promise<IPaginateResults<LiveObject>> {
        // const logger = this.logger.child({fn: "performQueryOnLive"});
        let platforms_choices = validateListData(
            getValueFromKey(
                args,
                "platforms",
                ["youtube", "bilibili", "twitch", "twitcasting", "mildom"],
                true
            ) as PlatformName[],
            "string"
        ) as PlatformName[];
        if (!Array.isArray(platforms_choices)) {
            platforms_choices = ["youtube", "bilibili", "twitch", "twitcasting", "mildom"];
        }
        if (Array.isArray(platforms_choices) && platforms_choices.length < 1) {
            platforms_choices = ["youtube", "bilibili", "twitch", "twitcasting", "mildom"];
        }
        const groups_choices = getValueFromKey(args, "groups", undefined, true);
        let allowed_users = getValueFromKey(args, "channel_id", undefined, true);
        let allowedVideoIds = getValueFromKey(args, "id", undefined, true);
        const max_lookforward = fallbackNaN(
            parseFloat,
            getValueFromKey(args, "max_scheduled_time", undefined),
            undefined
        );
        let max_lookback = fallbackNaN(parseInt, getValueFromKey(args, "max_lookback", 24), 24) as number;
        if (max_lookback < 0 || max_lookback > 24) {
            max_lookback = 24;
        }
        if (!Array.isArray(allowed_users)) {
            allowed_users = null;
        } else {
            allowed_users = allowed_users.filter((e) => typeof e === "string");
        }
        if (!Array.isArray(allowedVideoIds)) {
            allowedVideoIds = undefined;
        } else {
            allowedVideoIds = allowedVideoIds.filter((e) => typeof e === "string");
        }
        const pageOpts: IPaginateOptions = {
            limit: fallbackNaN(parseInt, _.get(args, "limit", 25), 25),
            cursor: _.get(args, "cursor", undefined),
            sortBy: _.get(args, "sort_by", "timeData.startTime"),
            sortOrder: _.get(args, "sort_order", "asc"),
        };

        const raw_results = await dataSources.videos.getVideos(
            platforms_choices,
            type,
            {
                groups: this.remapGroupsData(groups_choices),
                channel_ids: allowed_users,
                max_lookforward: max_lookforward,
                max_lookback: max_lookback,
                id: allowedVideoIds,
            },
            pageOpts
        );
        const main_results = raw_results.docs.map(this.mapLiveResultToSchema);
        const newPaged: IPaginateResults<LiveObject> = {
            docs: main_results,
            pageInfo: raw_results.pageInfo,
        };
        return newPaged;
    }

    async performQueryOnChannel(
        args: ChannelObjectParams,
        dataSources: VTAPIDataSources,
        parents: ChannelParents
    ): Promise<IPaginateResults<ChannelObject>> {
        let user_ids_limit =
            getValueFromKey(parents, "channel_id", null) || getValueFromKey(args, "id", null);
        let platforms_choices = validateListData(
            getValueFromKey(
                args,
                "platforms",
                ["youtube", "bilibili", "twitch", "twitcasting", "mildom"],
                true
            ) as PlatformName[],
            "string"
        ) as PlatformName[];
        if (!Array.isArray(platforms_choices)) {
            platforms_choices = ["youtube", "bilibili", "twitch", "twitcasting", "mildom"];
        }
        if (Array.isArray(platforms_choices) && platforms_choices.length < 1)
            platforms_choices = ["youtube", "bilibili", "twitch", "twitcasting", "mildom"];
        if (!Array.isArray(user_ids_limit)) {
            user_ids_limit = null;
        } else if (Array.isArray(user_ids_limit)) {
            if (typeof user_ids_limit[0] !== "string") {
                user_ids_limit = null;
            }
        }
        const groups_choices = getValueFromKey(args, "groups", null);

        if (parents.force_single) {
            const singleChResult = await dataSources.channels.getChannels(
                ["youtube", "bilibili", "twitch", "twitcasting", "mildom"],
                {
                    channel_ids: user_ids_limit,
                },
                {
                    sortBy: _.get(args, "sort_by", "publishedAt"),
                    sortOrder: _.get(args, "sort_order", "asc"),
                    limit: 5,
                }
            );
            if (singleChResult.docs.length < 1) {
                return {
                    docs: [],
                    pageInfo: null,
                };
            }
            const singleChResMap = this.mapChannelResultToSchema(singleChResult.docs[0]);
            return {
                docs: [singleChResMap],
                pageInfo: singleChResult.pageInfo,
            };
        }

        const pageOpts: IPaginateOptions = {
            limit: fallbackNaN(parseInt, _.get(args, "limit", 25), 25),
            cursor: _.get(args, "cursor", undefined),
            sortBy: _.get(args, "sort_by", "timeData.startTime"),
            sortOrder: _.get(args, "sort_order", "asc"),
        };

        const raw_results = await dataSources.channels.getChannels(
            platforms_choices,
            {
                channel_ids: user_ids_limit,
                groups: this.remapGroupsData(groups_choices),
            },
            pageOpts
        );
        const main_results = raw_results.docs.map(this.mapChannelResultToSchema);
        return {
            docs: main_results,
            pageInfo: raw_results.pageInfo,
        };
    }

    async performQueryOnChannelGrowth(dataSources: VTAPIDataSources, parents: ChannelParents) {
        const logger = this.logger.child({ fn: "performQueryOnChannelGrowth" });
        if (is_none(parents.channel_id)) {
            return null;
        }
        if (is_none(parents.platform)) return null;
        const histStats = await dataSources.statsHist
            .getChannelHistory(parents.channel_id[0], parents.platform)
            .catch((err: any) => {
                let channel_id;
                if (is_none(parents.channel_id)) {
                    channel_id = "Unknown_ID";
                } else {
                    channel_id = parents.channel_id[0];
                }
                logger.error(
                    `Failed to perform parents growth on a ${
                        parents.platform
                    } ID: ${channel_id} (${err.toString()})`
                );
                return { id: channel_id, history: [], platform: parents.platform };
            });
        if (is_none(parents.platform)) {
            return null;
        }
        return mapGrowthData(parents.platform, histStats["id"], histStats["history"]);
    }

    async performQueryOnChannelHistory(dataSources: VTAPIDataSources, parents: ChannelParents) {
        const logger = this.logger.child({ fn: "performQueryOnChannelGrowth" });
        if (is_none(parents.channel_id)) {
            return null;
        }
        if (is_none(parents.platform)) return null;
        const histStats = await dataSources.statsHist
            .getChannelHistory(parents.channel_id[0], parents.platform)
            .catch((err: any) => {
                let channel_id;
                if (is_none(parents.channel_id)) {
                    channel_id = "Unknown_ID";
                } else {
                    channel_id = parents.channel_id[0];
                }
                logger.error(
                    `Failed to perform parents growth on a ${
                        parents.platform
                    } ID: ${channel_id} (${err.toString()})`
                );
                return { id: channel_id, history: [], platform: parents.platform };
            });
        if (is_none(parents.platform)) {
            return null;
        }
        return mapHistoryData(parents.platform, histStats["id"], histStats["history"]);
    }

    async performGroupsFetch(dataSources: VTAPIDataSources): Promise<string[]> {
        const logger = this.logger.child({ fn: "performGroupsFetch" });
        logger.info("Fetching groups data...");
        const stringResults = await dataSources.channels.getGroups();
        return stringResults;
    }

    async getMentionedChannels(
        videoInfo: LiveObject,
        dataSources: VTAPIDataSources,
        cacheServers: CustomRedisCache,
        noCache?: boolean
    ) {
        const logger = this.logger.child({ fn: "getMentionedChannels" });
        logger.info(
            `Fetching mentioned channel for ${videoInfo.id} (${videoInfo.platform}) [${videoInfo.status}]`
        );
        const rawVideoResults = await dataSources.videos.getVideos(
            [videoInfo.platform],
            videoInfo.status,
            { id: [videoInfo.id], is_mention_check: true },
            {
                project: {
                    id: 1,
                    platform: 1,
                    mentioned: 1,
                },
            }
        );

        if (rawVideoResults.docs.length < 1) {
            logger.warn(`${videoInfo.id}: query return is empty for some reason, ignoring...`);
            return [];
        }
        const findMatching = rawVideoResults.docs.filter(
            (e) => e.id === videoInfo.id && e.platform === videoInfo.platform
        );
        if (findMatching.length < 1) {
            logger.warn(`${videoInfo.id}: cannot find it in database for some reason, ignoring...`);
            return [];
        }
        const theOnlyOne = findMatching[0];
        const mentionedData = theOnlyOne.mentioned || [];
        if (mentionedData.length < 1) {
            logger.info(`${videoInfo.id}: no mentioned channel, ignoring...`);
            return [];
        }
        const allMentioned = mentionedData.map((r) => r.id).sort();
        const cacheName = getCacheNameForChannels({ id: allMentioned }, "mentioned");
        let [results, ttl]: [IPaginateResults<ChannelObject>, number] = await cacheServers.getBetter(
            cacheName,
            true
        );
        if (is_none(results)) {
            results = await this.performQueryOnChannel({}, dataSources, {
                channel_id: allMentioned,
                type: "channel",
            });
            if (!noCache && results.docs.length > 0) {
                ttl = 1800;
                await cacheServers.setexBetter(cacheName, ttl, results);
            }
        }
        if (results.docs.length < 1) {
            logger.error(`${videoInfo.id}: failed to fetch mentioned channels, ignoring...`);
            return [];
        }
        return results.docs;
    }
}

const VTPrefix = "vtapi-gqlcache";
function getCacheNameForLive(args: LiveObjectParams, type: LiveStatus): string {
    const groups_filters = validateListData(
        getValueFromKey(args, "groups", [], true) as string[],
        "string"
    ) as string[];
    const channels_filters = validateListData(
        getValueFromKey(args, "channel_id", [], true) as string[],
        "string"
    ) as string[];
    const videoid_filters = validateListData(
        getValueFromKey(args, "id", [], true) as string[],
        "string"
    ) as string[];
    const platforms = validateListData(
        getValueFromKey(
            args,
            "platforms",
            ["youtube", "bilibili", "twitch", "twitcasting", "mildom"],
            true
        ) as PlatformName[],
        "string"
    ) as PlatformName[];
    const sortBy: string =
        "-sort_" +
        getValueFromKey(
            args,
            "sort_by",
            ["live", "upcoming"].includes(type)
                ? "timeData.startTime"
                : type === "past"
                ? "timeData.endTime"
                : "timeData.publishedAt",
            true
        );
    let sortOrder = getValueFromKey(args, "sort_order", "asc", true) as SortOrder;
    sortOrder = sortOrder.toLowerCase() as SortOrder;
    let curr = getValueFromKey(args, "cursor", "nocursor", true) as string;
    let lookback = "";
    if (type === "past") {
        const max_lookback = fallbackNaN(
            parseInt,
            getValueFromKey(args, "max_lookback", 24, true),
            24
        ) as number;
        lookback = "-lb_" + max_lookback.toString();
    }
    let lookforward = "";
    if (type === "upcoming") {
        const lfData = fallbackNaN(parseInt, getValueFromKey(args, "max_scheduled_time", null), null);
        if (typeof lfData === "number") {
            lookforward = "-lf_" + lfData.toString();
        } else {
            lookforward = "-lf_nomax";
        }
    }
    if (curr.length < 1 || curr === " ") {
        curr = "nocursor";
    }
    curr = "-cur_" + curr;
    const limit_val = fallbackNaN(parseInt, getValueFromKey(args, "limit", 25), 25) as number;
    const limit = "-l" + limit_val.toString();
    if (!["asc", "ascending", "desc", "descending"].includes(sortOrder)) {
        sortOrder = "asc";
    }
    let final_name = `${VTPrefix}-${type}`;
    if (groups_filters.length < 1) {
        final_name += "-nogroups";
    } else {
        final_name += `-groups_${groups_filters.join("_")}`;
    }
    if (channels_filters.length < 1) {
        final_name += "-nospecific_chid";
    } else {
        final_name += `-channels_${channels_filters.join("_")}`;
    }
    if (videoid_filters.length < 1) {
        final_name += "-nospecific_id";
    } else {
        final_name += `-videoid_${videoid_filters.join("_")}`;
    }
    if (platforms.length < 1) {
        // not possible to get but okay.
        final_name += "-noplatforms";
    } else if (
        platforms.includes("youtube") &&
        platforms.includes("bilibili") &&
        platforms.includes("twitch") &&
        platforms.includes("twitcasting") &&
        platforms.includes("mildom")
    ) {
        final_name += "-allplatforms";
    } else {
        final_name += "-platforms_";
        if (platforms.includes("youtube")) {
            final_name += "yt_";
        }
        if (platforms.includes("bilibili")) {
            final_name += "b2_";
        }
        if (platforms.includes("twitch")) {
            final_name += "twch_";
        }
        if (platforms.includes("twitcasting")) {
            final_name += "twcast_";
        }
        if (platforms.includes("mildom")) {
            final_name += "mildom_";
        }
        final_name = _.truncate(final_name, { omission: "", length: final_name.length - 1 });
    }
    final_name += sortBy + "-ord_" + sortOrder + limit + lookforward + lookback + curr;
    return final_name;
}

function getCacheNameForChannels(
    args: ChannelObjectParams,
    type: "channel" | "stats" | "singlech" | "growth" | "history" | "mentioned",
    parent: Nullable<ChannelObject> = null
) {
    let final_name = `${VTPrefix}-${type}`;
    if (["stats", "growth", "history"].includes(type)) {
        // @ts-ignore
        final_name += `-platforms_${parent.platform}-ch_${parent.id}`;
        return final_name;
    }
    if (type === "singlech") {
        // @ts-ignore
        final_name += `-platforms_${parent.platform}-ch_${parent.channel_id}`;
        return final_name;
    }
    if (type === "mentioned") {
        final_name += `-platforms_multi-chmention_${args.id?.join(",")}`;
        return final_name;
    }
    const groups_filters = validateListData(
        getValueFromKey(args, "groups", [], true) as string[],
        "string"
    ) as string[];
    const channels_filters = validateListData(
        getValueFromKey(args, "id", [], true) as string[],
        "string"
    ) as string[];
    const platforms = validateListData(
        getValueFromKey(
            args,
            "platforms",
            ["youtube", "bilibili", "twitch", "twitcasting", "mildom"],
            true
        ) as PlatformName[],
        "string"
    ) as PlatformName[];
    const sortBy = "-sort_" + getValueFromKey(args, "sort_by", "publishedAt", true);
    let sortOrder = getValueFromKey(args, "sort_order", "asc", true) as SortOrder;
    sortOrder = sortOrder.toLowerCase() as SortOrder;
    const curr = "-cur_" + getValueFromKey(args, "cursor", "nocursor", true);
    const limit_val = fallbackNaN(parseInt, getValueFromKey(args, "limit", 25), 25) as number;
    const limit = "-l" + limit_val.toString();
    if (!["asc", "ascending", "desc", "descending"].includes(sortOrder)) {
        sortOrder = "asc";
    }
    if (groups_filters.length < 1) {
        final_name += "-nogroups";
    } else {
        final_name += `-groups_${groups_filters.join("_")}`;
    }
    if (channels_filters.length < 1) {
        final_name += "-nospecifics";
    } else {
        final_name += `-channels_${channels_filters.join("_")}`;
    }
    if (platforms.length < 1) {
        // not possible to get but okay.
        final_name += "-noplatforms";
    } else if (
        platforms.includes("youtube") &&
        platforms.includes("bilibili") &&
        platforms.includes("twitch") &&
        platforms.includes("twitcasting") &&
        platforms.includes("mildom")
    ) {
        final_name += "-allplatforms";
    } else {
        final_name += "-platforms_";
        if (platforms.includes("youtube")) {
            final_name += "yt_";
        }
        if (platforms.includes("bilibili")) {
            final_name += "b2_";
        }
        if (platforms.includes("twitch")) {
            final_name += "twch_";
        }
        if (platforms.includes("twitcasting")) {
            final_name += "twcast_";
        }
        if (platforms.includes("mildom")) {
            final_name += "mildom_";
        }
        final_name = _.truncate(final_name, { omission: "", length: final_name.length - 1 });
    }
    final_name += sortBy + "-ord_" + sortOrder + limit + curr;
    return final_name;
}

// Initialize query class
export const VTQuery = new VTAPIQuery();

// Create main resolvers
export const VTAPIv2Resolvers: IResolvers = {
    Query: {
        live: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            const logger = MainLogger.child({ fn: "live" });
            let limit = getValueFromKey(args, "limit", 25) as number;
            if (limit >= 100) {
                limit = 100;
            }
            logger.info("Processing live()");
            logger.info("Checking for cache...");
            const no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            const cache_name = getCacheNameForLive(args, "live");
            // @ts-ignore
            // eslint-disable-next-line prefer-const
            let [results, ttl]: [IPaginateResults<LiveObject>, number] = await ctx.cacheServers.getBetter(
                cache_name,
                true
            );
            if (!is_none(results) && !no_cache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnLive(args, "live", ctx.dataSources);
                logger.info(`Saving cache with name ${cache_name}, TTL 20s...`);
                if (!no_cache && results.docs.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 20, results);
                    ctx.res.set("Cache-Control", "private, max-age=20");
                }
            }
            let hasNextPage = _.get(_.get(results, "pageInfo", {}), "hasNextPage", false);
            let nextCursor;
            if (hasNextPage) {
                nextCursor = _.get(_.get(results, "pageInfo", {}), "nextCursor", null);
            } else {
                nextCursor = null;
            }
            if (is_none(nextCursor)) {
                hasNextPage = false;
            }
            const final_results: LivesResource = {
                _total: _.get(_.get(results, "pageInfo", {}), "totalData", 0) || 0,
                items: results.docs,
                pageInfo: {
                    total_results: results.docs.length,
                    results_per_page: limit,
                    nextCursor: nextCursor,
                    hasNextPage: hasNextPage,
                },
            };

            // @ts-ignore
            info.cacheControl.setCacheHint({ maxAge: 20, scope: "PRIVATE" });
            return final_results;
        },
        upcoming: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({ maxAge: 20, scope: "PRIVATE" });
            const logger = MainLogger.child({ fn: "upcoming" });
            let limit = getValueFromKey(args, "limit", 25) as number;
            if (limit >= 100) {
                limit = 100;
            }
            logger.info("Processing upcoming()");
            logger.info("Checking for cache...");
            const no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            const cache_name = getCacheNameForLive(args, "upcoming");
            // eslint-disable-next-line prefer-const
            let [results, ttl]: [IPaginateResults<LiveObject>, number] = await ctx.cacheServers.getBetter(
                cache_name,
                true
            );
            if (!is_none(results) && !no_cache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnLive(args, "upcoming", ctx.dataSources);
                logger.info(`Saving cache with name ${cache_name}, TTL 20s...`);
                if (!no_cache && results.docs.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 20, results);
                    ctx.res.set("Cache-Control", "private, max-age=20");
                }
            }
            let hasNextPage = _.get(_.get(results, "pageInfo", {}), "hasNextPage", false);
            let nextCursor;
            if (hasNextPage) {
                nextCursor = _.get(_.get(results, "pageInfo", {}), "nextCursor", null);
            } else {
                nextCursor = null;
            }
            if (is_none(nextCursor)) {
                hasNextPage = false;
            }
            const final_results: LivesResource = {
                _total: _.get(_.get(results, "pageInfo", {}), "totalData", 0) || 0,
                items: results.docs,
                pageInfo: {
                    total_results: results.docs.length,
                    results_per_page: limit,
                    nextCursor: nextCursor,
                    hasNextPage: hasNextPage,
                },
            };
            return final_results;
        },
        ended: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({ maxAge: 300, scope: "PRIVATE" });
            const logger = MainLogger.child({ fn: "ended" });
            let limit = getValueFromKey(args, "limit", 25) as number;
            if (limit >= 100) {
                limit = 100;
            }
            logger.info("Processing ended()");
            logger.info("Checking for cache...");
            const no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            const cache_name = getCacheNameForLive(args, "past");
            // eslint-disable-next-line prefer-const
            let [results, ttl]: [IPaginateResults<LiveObject>, number] = await ctx.cacheServers.getBetter(
                cache_name,
                true
            );
            if (!is_none(results) && !no_cache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnLive(args, "past", ctx.dataSources);
                logger.info(`Saving cache with name ${cache_name}, TTL 300s...`);
                if (!no_cache && results.docs.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 300, results);
                    ctx.res.set("Cache-Control", "private, max-age=300");
                }
            }
            let hasNextPage = _.get(_.get(results, "pageInfo", {}), "hasNextPage", false);
            let nextCursor;
            if (hasNextPage) {
                nextCursor = _.get(_.get(results, "pageInfo", {}), "nextCursor", null);
            } else {
                nextCursor = null;
            }
            if (is_none(nextCursor)) {
                hasNextPage = false;
            }
            const final_results: LivesResource = {
                _total: _.get(_.get(results, "pageInfo", {}), "totalData", 0) || 0,
                items: results.docs,
                pageInfo: {
                    total_results: results.docs.length,
                    results_per_page: limit,
                    nextCursor: nextCursor,
                    hasNextPage: hasNextPage,
                },
            };
            return final_results;
        },
        videos: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({ maxAge: 1800, scope: "PRIVATE" });
            const logger = MainLogger.child({ fn: "videos" });
            let limit = getValueFromKey(args, "limit", 25) as number;
            if (limit >= 100) {
                limit = 100;
            }
            logger.info("Processing videos()");
            logger.info("Checking for cache...");
            const no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            const cache_name = getCacheNameForLive(args, "video");
            // eslint-disable-next-line prefer-const
            let [results, ttl]: [IPaginateResults<LiveObject>, number] = await ctx.cacheServers.getBetter(
                cache_name,
                true
            );
            if (!is_none(results) && !no_cache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnLive(
                    args,
                    args.statuses || ["video", "past"],
                    ctx.dataSources
                );
                logger.info(`Saving cache with name ${cache_name}, TTL 1800s...`);
                if (!no_cache && results.docs.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                    ctx.res.set("Cache-Control", "private, max-age=1800");
                }
            }
            let hasNextPage = _.get(_.get(results, "pageInfo", {}), "hasNextPage", false);
            let nextCursor;
            if (hasNextPage) {
                nextCursor = _.get(_.get(results, "pageInfo", {}), "nextCursor", null);
            } else {
                nextCursor = null;
            }
            if (is_none(nextCursor)) {
                hasNextPage = false;
            }
            const final_results: LivesResource = {
                _total: _.get(_.get(results, "pageInfo", {}), "totalData", 0) || 0,
                items: results.docs,
                pageInfo: {
                    total_results: results.docs.length,
                    results_per_page: limit,
                    nextCursor: nextCursor,
                    hasNextPage: hasNextPage,
                },
            };
            return final_results;
        },
        channels: async (
            _s,
            args: ChannelObjectParams,
            ctx: VTAPIContext,
            info
        ): Promise<ChannelsResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({ maxAge: 1800, scope: "PRIVATE" });
            const logger = MainLogger.child({ fn: "channels" });
            let limit = getValueFromKey(args, "limit", 25) as number;
            if (limit > 100) {
                limit = 100;
            }
            logger.info("Processing channels()");
            logger.info("Checking for cache...");
            const no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            const resetCache = map_bool(getValueFromKey(ctx.req.query, "resetcache", "0"));
            if (no_cache) {
                logger.info("No cache requested!");
            }
            const cache_name = getCacheNameForChannels(args, "channel");
            // eslint-disable-next-line prefer-const
            let [results, ttl]: [IPaginateResults<ChannelObject>, number] = await ctx.cacheServers.getBetter(
                cache_name,
                true
            );
            if (!is_none(results) && !no_cache && !resetCache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnChannel(args, ctx.dataSources, {
                    channel_id: args.id,
                    type: "channel",
                    force_single: false,
                });
                logger.info(`Saving cache with name ${cache_name}, TTL 1800s...`);
                if (!no_cache && results.docs.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                    ctx.res.set("Cache-Control", "private, max-age=1800");
                } else if (resetCache && results.docs.length) {
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                    ctx.res.set("Cache-Control", "private, max-age=1800");
                }
            }
            let hasNextPage = _.get(_.get(results, "pageInfo", {}), "hasNextPage", false);
            let nextCursor;
            if (hasNextPage) {
                nextCursor = _.get(_.get(results, "pageInfo", {}), "nextCursor", null);
            } else {
                nextCursor = null;
            }
            if (is_none(nextCursor)) {
                hasNextPage = false;
            }
            const final_results: ChannelsResource = {
                _total: _.get(_.get(results, "pageInfo", {}), "totalData", 0) || 0,
                items: results.docs,
                pageInfo: {
                    total_results: results.docs.length,
                    results_per_page: limit,
                    nextCursor: nextCursor,
                    hasNextPage: hasNextPage,
                },
            };
            return final_results;
        },
        groups: async (_s, _a, ctx: VTAPIContext, info): Promise<GroupsResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({ maxAge: 300, scope: "PRIVATE" });
            const logger = MainLogger.child({ fn: "groups" });
            logger.info("Processing groups()");
            logger.info("Checking for cache...");
            const cache_name = "vtapi-groups-data";
            // eslint-disable-next-line prefer-const
            let [results, ttl]: [string[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results)) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                results = await VTQuery.performGroupsFetch(ctx.dataSources);
                logger.info(`Saving cache with name ${cache_name}, TTL 300s...`);
                if (results.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 300, results);
                    ctx.res.set("Cache-Control", "private, max-age=300");
                }
            }
            const final_results: GroupsResource = {
                items: results.sort(),
            };
            return final_results;
        },
    },
    ChannelObject: {
        growth: async (
            parent: ChannelObject,
            args: ChannelObjectParams,
            ctx: VTAPIContext,
            info
        ): Promise<ChannelGrowthObject> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({ maxAge: 1800, scope: "PRIVATE" });
            // const logger = MainLogger.child({fn: "ChannelObject.growth"});
            const no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            // @ts-ignore
            const cache_name = getCacheNameForChannels({}, "growth", parent);
            let [results, ttl]: [Nullable<ChannelGrowthObject>, number] = await ctx.cacheServers.getBetter(
                cache_name,
                true
            );
            if (is_none(results)) {
                results = await VTQuery.performQueryOnChannelGrowth(ctx.dataSources, {
                    // @ts-ignore
                    channel_id: [parent.id],
                    platform: parent.platform,
                });
                ttl = 1800;
                if (
                    _.get(results, "subscribersGrowth", null) !== null ||
                    _.get(results, "viewsGrowth", null) !== null
                ) {
                    if (!no_cache) {
                        await ctx.cacheServers.setexBetter(cache_name, ttl, results);
                    }
                }
                if (no_cache) {
                    ttl = 0;
                }
            }
            ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            if (is_none(results)) {
                return {
                    subscribersGrowth: null,
                    viewsGrowth: null,
                };
            }
            return results;
        },
        history: async (
            parent: ChannelObject,
            args: ChannelObjectParams,
            ctx: VTAPIContext,
            info
        ): Promise<ChannelsStatsHistory> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({ maxAge: 1800, scope: "PRIVATE" });
            // const logger = MainLogger.child({fn: "ChannelObject.growth"});
            const no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            // @ts-ignore
            const cache_name = getCacheNameForChannels({}, "growth", parent);
            let [results, ttl]: [Nullable<ChannelsStatsHistory>, number] = await ctx.cacheServers.getBetter(
                cache_name,
                true
            );

            if (is_none(results)) {
                // @ts-ignore
                results = await VTQuery.performQueryOnChannelHistory(ctx.dataSources, {
                    // @ts-ignore
                    channel_id: [parent.id],
                    platform: parent.platform,
                });
                ttl = 1800;
                if (
                    _.get(results, "subscribersGrowth", null) !== null ||
                    _.get(results, "viewsGrowth", null) !== null
                ) {
                    if (!no_cache) {
                        await ctx.cacheServers.setexBetter(cache_name, ttl, results);
                    }
                }
                if (no_cache) {
                    ttl = 0;
                }
            }
            ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            if (is_none(results)) {
                return {
                    subscribersCount: [],
                    videosCount: [],
                    viewsCount: [],
                };
            }
            return results;
        },
    },
    LiveObject: {
        channel: async (
            parent: LiveObject,
            args: ChannelObjectParams,
            ctx: VTAPIContext,
            info
        ): Promise<Nullable<ChannelObject>> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({ maxAge: 1800, scope: "PRIVATE" });
            const logger = MainLogger.child({ fn: "LiveObject.channel" });
            const no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            // @ts-ignore
            const cache_name = getCacheNameForChannels({}, "singlech", parent);
            let [results, ttl]: [IPaginateResults<ChannelObject>, number] = await ctx.cacheServers.getBetter(
                cache_name,
                true
            );
            if (is_none(results)) {
                results = await VTQuery.performQueryOnChannel(args, ctx.dataSources, {
                    // @ts-ignore
                    channel_id: [parent.channel_id],
                    force_single: true,
                    type: "channel",
                    group: parent.group,
                    platform: parent.platform,
                });
                if (!no_cache && results.docs.length > 0) {
                    // dont cache for reason.
                    ttl = 1800;
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                }
            }
            if (results.docs.length < 1) {
                logger.error(`Failed to fetch ${parent.platform} ${parent.channel_id} ${parent.group}`);
                return null;
            }
            ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            return results.docs[0];
        },
        mentions: async (
            parent: LiveObject,
            _a: ChannelObjectParams,
            ctx: VTAPIContext,
            info
        ): Promise<ChannelObject[]> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({ maxAge: 1800, scope: "PRIVATE" });
            const no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            const fetchedChannels = await VTQuery.getMentionedChannels(
                parent,
                ctx.dataSources,
                ctx.cacheServers,
                no_cache
            );
            return fetchedChannels;
        },
    },
    DateTime: DateTimeScalar,
    Mutation: {
        VTuberAdd: async (
            _e,
            { id, group, name, platform }: VTAddMutationParams,
            ctx: VTAPIContext
        ): Promise<ChannelObject> => {
            const mut = VTuberMutation[platform as keyof typeof VTuberMutation];
            if (is_none(mut)) {
                ctx.res.status(400);
                throw new ApolloError(
                    `Unknown platform key provided, ${platform} is not available.`,
                    "VT_UNKNOWN_PLATFORM"
                );
            }
            const header = ctx.req.headers;
            let authHeader = header.authorization;
            if (typeof authHeader !== "string") {
                ctx.res.status(401);
                throw new ApolloError(
                    "You need to provide an Authorization header to authenticate!",
                    "AUTH_MISSING"
                );
            }
            if (!authHeader.startsWith("password ")) {
                ctx.res.status(400);
                throw new ApolloError(
                    "Authorization header need to start with `password `",
                    "AUTH_MISCONFIGURED"
                );
            }
            authHeader = authHeader.slice(9);
            if (authHeader !== config.secure_password) {
                ctx.res.status(403);
                throw new ApolloError("Wrong password provided, please check again", "AUTH_FAILED");
            }
            const [is_success, message] = await mut(id, group, name);
            if (!is_success) {
                let errCode = 500;
                let errType = "INTERNAL_ERROR";
                if (message.toLowerCase().includes("cannot find")) {
                    errCode = 404;
                    errType = "VT_NOT_FOUND";
                }
                if (message.toLowerCase().includes("already exist")) {
                    errType = "VT_ALREADY_EXIST";
                }
                ctx.res.status(errCode);
                throw new ApolloError(message as string, errType);
            }
            const no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            const cache_name = getCacheNameForChannels({}, "singlech", {
                platform: platform,
                // @ts-ignore
                channel_id: id,
            });
            const queried = await VTQuery.performQueryOnChannel(
                { id: [id], platforms: [platform] },
                ctx.dataSources,
                {
                    channel_id: [id],
                    force_single: true,
                    type: "channel",
                    group: group,
                    platform: platform,
                }
            );
            let ttl = 0;
            if (!no_cache && queried.docs.length > 0) {
                ttl = 1800;
                await ctx.cacheServers.setexBetter(cache_name, ttl, queried);
            }
            ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            return queried.docs[0];
        },
        VTuberRemove: async (
            _e,
            { id, platform }: VTMutationBase,
            ctx: VTAPIContext
        ): Promise<MutatedRemovedVTuber> => {
            const header = ctx.req.headers;
            let authHeader = header.authorization;
            if (typeof authHeader !== "string") {
                ctx.res.status(401);
                throw new ApolloError(
                    "You need to provide an Authorization header to authenticate!",
                    "AUTH_MISSING"
                );
            }
            if (!authHeader.startsWith("password ")) {
                ctx.res.status(400);
                throw new ApolloError(
                    "Authorization header need to start with `password `",
                    "AUTH_MISCONFIGURED"
                );
            }
            authHeader = authHeader.slice(9);
            if (authHeader !== config.secure_password) {
                ctx.res.status(403);
                throw new ApolloError("Wrong password provided, please check again", "AUTH_FAILED");
            }
            const findVTuber = await ctx.dataSources.channels.getChannels([platform], { channel_ids: [id] });
            const realData = findVTuber.docs;
            if (realData.length < 1) {
                ctx.res.status(404);
                throw new ApolloError(
                    "Can't find the mentioned VTuber, please make sure you enter the correct platform and id",
                    "NOT_FOUND"
                );
            }
            const theOneAndOnly = find(realData, (o) => o.id === id);
            if (is_none(theOneAndOnly)) {
                ctx.res.status(404);
                throw new ApolloError(
                    "Can't find the mentioned VTuber, please make sure you enter the correct platform and id",
                    "NOT_FOUND"
                );
            }

            let shouldThrowError = false;

            try {
                const removedData = await ChannelsData.deleteOne({
                    id: { $eq: id },
                    platform: { $eq: platform },
                });
                if (typeof removedData.deletedCount === "number" && removedData.deletedCount > 0) {
                    return {
                        id,
                        platform,
                        isRemoved: true,
                    };
                } else {
                    ctx.res.status(500);
                    shouldThrowError = true;
                }
            } catch (e) {
                ctx.res.status(500);
                throw new ApolloError("Failed to contact database, please try again later", "DB_ERROR");
            }

            if (shouldThrowError) {
                throw new ApolloError(
                    "Failed to remove the mentioned VTuber, please try again later",
                    "REMOVAL_FAILURE"
                );
            }
            return {
                id,
                platform,
                isRemoved: false,
            };
        },
        VTuberRetired: async (
            _e,
            { id, platform, retire }: VTRetiredMutationParams,
            ctx: VTAPIContext
            // @ts-ignore
        ): Promise<ChannelObject> => {
            const header = ctx.req.headers;
            let authHeader = header.authorization;
            if (typeof authHeader !== "string") {
                ctx.res.status(401);
                throw new ApolloError(
                    "You need to provide an Authorization header to authenticate!",
                    "AUTH_MISSING"
                );
            }
            if (!authHeader.startsWith("password ")) {
                ctx.res.status(400);
                throw new ApolloError(
                    "Authorization header need to start with `password `",
                    "AUTH_MISCONFIGURED"
                );
            }
            authHeader = authHeader.slice(9);
            if (authHeader !== config.secure_password) {
                ctx.res.status(403);
                throw new ApolloError("Wrong password provided, please check again", "AUTH_FAILED");
            }

            const findVTuber = await ctx.dataSources.channels.getChannels([platform], { channel_ids: [id] });
            const realData = findVTuber.docs;
            if (realData.length < 1) {
                ctx.res.status(404);
                throw new ApolloError(
                    "Can't find the mentioned VTuber, please make sure you enter the correct platform and id",
                    "NOT_FOUND"
                );
            }
            const theOneAndOnly = find(realData, (o) => o.id === id);
            if (is_none(theOneAndOnly)) {
                ctx.res.status(404);
                throw new ApolloError(
                    "Can't find the mentioned VTuber, please make sure you enter the correct platform and id",
                    "NOT_FOUND"
                );
            }

            const is_retired = map_bool(retire);

            let shouldThrowError = false;

            try {
                const changedData = await ChannelsData.updateOne(
                    {
                        id: { $eq: id },
                        platform: { $eq: platform },
                    },
                    { $set: { is_retired: is_retired } }
                );
                if (changedData.ok === 1) {
                    theOneAndOnly["is_retired"] = is_retired;
                    return VTQuery.mapChannelResultToSchema(theOneAndOnly);
                } else {
                    ctx.res.status(500);
                    shouldThrowError = true;
                }
            } catch (e) {
                console.error(e);
                ctx.res.status(500);
                throw new ApolloError("Failed to contact database, please try again later", "DB_ERROR");
            }

            if (shouldThrowError) {
                throw new ApolloError(
                    "Failed to update the mentioned VTuber, please try again later",
                    "UPDATE_FAILURE"
                );
            }
        },
        VTuberSetNote: async (
            _e,
            { id, platform, newNote }: VTSetNoteMutationParams,
            ctx: VTAPIContext
            // @ts-ignore
        ) => {
            const header = ctx.req.headers;
            let authHeader = header.authorization;
            if (typeof authHeader !== "string") {
                ctx.res.status(401);
                throw new ApolloError(
                    "You need to provide an Authorization header to authenticate!",
                    "AUTH_MISSING"
                );
            }
            if (!authHeader.startsWith("password ")) {
                ctx.res.status(400);
                throw new ApolloError(
                    "Authorization header need to start with `password `",
                    "AUTH_MISCONFIGURED"
                );
            }
            authHeader = authHeader.slice(9);
            if (authHeader !== config.secure_password) {
                ctx.res.status(403);
                throw new ApolloError("Wrong password provided, please check again", "AUTH_FAILED");
            }

            const findVTuber = await ctx.dataSources.channels.getChannels([platform], { channel_ids: [id] });
            const realData = findVTuber.docs;
            if (realData.length < 1) {
                ctx.res.status(404);
                throw new ApolloError(
                    "Can't find the mentioned VTuber, please make sure you enter the correct platform and id",
                    "NOT_FOUND"
                );
            }
            const theOneAndOnly = find(realData, (o) => o.id === id) as Nullable<ChannelsProps>;
            if (is_none(theOneAndOnly)) {
                ctx.res.status(404);
                throw new ApolloError(
                    "Can't find the mentioned VTuber, please make sure you enter the correct platform and id",
                    "NOT_FOUND"
                );
            }

            let theRealNote = null;
            if (typeof newNote === "string" && newNote.replace(/\s+/g, "").length > 0) {
                theRealNote = newNote;
            }

            let shouldThrowError = false;

            try {
                const changedData = await ChannelsData.updateOne(
                    {
                        id: { $eq: id },
                        platform: { $eq: platform },
                    },
                    { $set: { note: theRealNote as string | undefined } }
                );
                if (changedData.ok === 1) {
                    theOneAndOnly["note"] = theRealNote as string | undefined;
                    return VTQuery.mapChannelResultToSchema(theOneAndOnly);
                } else {
                    ctx.res.status(500);
                    shouldThrowError = true;
                }
            } catch (e) {
                console.error(e);
                ctx.res.status(500);
                throw new ApolloError("Failed to contact database, please try again later", "DB_ERROR");
            }

            if (shouldThrowError) {
                throw new ApolloError(
                    "Failed to update the mentioned VTuber, please try again later",
                    "UPDATE_FAILURE"
                );
            }
        },
    },
};
