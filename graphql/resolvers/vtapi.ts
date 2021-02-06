import _ from "lodash";
import 'apollo-cache-control';
import express from "express";
import moment from "moment-timezone";
import { IResolvers } from "apollo-server-express";
import { Buffer } from "buffer";

// Import models
import {
    LiveObject,
    ChannelObject,
    LiveObjectParams,
    ChannelObjectParams,
    LiveStatus,
    PlatformName,
    DateTimeScalar,
    LivesResource,
    ChannelsResource,
    SortOrder,
    ChannelGrowth,
    GroupsResource,
    ChannelGrowthObject,
} from "../schemas";
import { VTAPIDataSources } from "../datasources";

import {
    VideoProps,
    ChannelsProps
} from "../../dbconn/models"
import { CustomRedisCache } from "../caches/redis";
import { Memoize } from "../../utils/decorators";
import { get_group } from "../../utils/filters";
import { fallbackNaN, filter_empty, getValueFromKey, is_none, map_bool, sortObjectsByKey } from "../../utils/swissknife";
import { logger as TopLogger } from "../../utils/logger";
import { IPaginateOptions, IPaginateResults } from "../../dbconn/models/pagination";

const MainLogger = TopLogger.child({cls: "GQLVTuberAPI"});

const ONE_DAY = 864E2;

interface ChannelParents {
    platform?: PlatformName
    group?: string
    channel_id?: string[]
    type: | "stats" | "channel"
    force_single?: boolean
}

interface VTAPIContext {
    req: express.Request
    res: express.Response
    cacheServers: CustomRedisCache
    dataSources: VTAPIDataSources
}

interface HistoryGrowthData {
    timestamp: number
    subscriberCount?: number
    viewCount?: number
    videoCount?: number
    followerCount?: number
    level?: number
}

function fallbackGrowthMakeSure(historyData?: HistoryGrowthData): HistoryGrowthData {
    if (typeof historyData === "undefined") {
        return {
            timestamp: -1,
            subscriberCount: undefined,
            viewCount: undefined,
            videoCount: undefined,
            followerCount: undefined,
            level: undefined
        }
    }
    let ts = _.get(historyData, "timestamp", -1);
    let sC = _.get(historyData, "subscriberCount", undefined);
    let vC = _.get(historyData, "viewCount", undefined);
    let vdC = _.get(historyData, "videoCount", undefined);
    let fC = _.get(historyData, "followerCount", undefined);
    let lC = _.get(historyData, "level", undefined);
    return {
        timestamp: ts,
        subscriberCount: sC,
        viewCount: vC,
        videoCount: vdC,
        followerCount: fC,
        level: lC
    }
}

function fallbackGrowthIfNaN(growth: ChannelGrowth): ChannelGrowth {
    let oD = _.get(growth, "oneDay", NaN);
    let oW = _.get(growth, "oneWeek", NaN);
    let tW = _.get(growth, "twoWeeks", NaN);
    let oM = _.get(growth, "oneMonth", NaN);
    let sM = _.get(growth, "sixMonths", NaN);
    let oY = _.get(growth, "oneYear", NaN);
    let ts = _.get(growth, "lastUpdated", -1);
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
    }
}

function mapGrowthData(platform: PlatformName, channelId: string, historyData?: HistoryGrowthData[]): ChannelGrowthObject {
    const logger = MainLogger.child({fn: "mapGrowthData"});
    if (typeof historyData === "undefined") {
        return null;
    }
    if (_.isNull(historyData)) {
        return null;
    }
    let currentTime = moment.tz("UTC").unix();
    let oneDay = currentTime - ONE_DAY,
        oneWeek = currentTime - (ONE_DAY * 7),
        twoWeeks = currentTime - (ONE_DAY * 14),
        oneMonth = currentTime - (ONE_DAY * 30),
        sixMonths = currentTime - (ONE_DAY * 183),
        oneYear = currentTime - (ONE_DAY * 365);

    if (historyData.length < 1) {
        logger.error(`history data is less than one, returning null for ${platform} ${channelId}`);
        return null;
    }

    let lookbackOneDay = _.sortBy(historyData.filter(res => res.timestamp >= oneDay), (o) => o.timestamp);
    let lookbackOneWeek = _.sortBy(historyData.filter(res => res.timestamp >= oneWeek), (o) => o.timestamp);
    let lookbackTwoWeeks = _.sortBy(historyData.filter(res => res.timestamp >= twoWeeks), (o) => o.timestamp);
    let lookbackOneMonth = _.sortBy(historyData.filter(res => res.timestamp >= oneMonth), (o) => o.timestamp);
    let lookbackSixMonths = _.sortBy(historyData.filter(res => res.timestamp >= sixMonths), (o) => o.timestamp);
    let lookbackOneYear = _.sortBy(historyData.filter(res => res.timestamp >= oneYear), (o) => o.timestamp);
    if (lookbackOneDay.length < 1 && lookbackOneWeek.length < 1 && lookbackTwoWeeks.length < 1 && lookbackOneMonth.length < 1 && lookbackSixMonths.length < 1 && lookbackOneYear.length) {
        logger.error(`missing all history data after filtering, returning null for ${platform} ${channelId}`);
        return null;
    }

    let oneDayStart = fallbackGrowthMakeSure(_.nth(lookbackOneDay, 0)),
        oneDayEnd = fallbackGrowthMakeSure(_.nth(lookbackOneDay, -1));
    let oneWeekStart = fallbackGrowthMakeSure(_.nth(lookbackOneWeek, 0)),
        oneWeekEnd = fallbackGrowthMakeSure(_.nth(lookbackOneWeek, -1));
    let twoWeeksStart = fallbackGrowthMakeSure(_.nth(lookbackTwoWeeks, 0)),
        twoWeeksEnd = fallbackGrowthMakeSure(_.nth(lookbackTwoWeeks, -1));
    let oneMonthStart = fallbackGrowthMakeSure(_.nth(lookbackOneMonth, 0)),
        oneMonthEnd = fallbackGrowthMakeSure(_.nth(lookbackOneMonth, -1));
    let sixMonthsStart = fallbackGrowthMakeSure(_.nth(lookbackSixMonths, 0)),
        sixMonthsEnd = fallbackGrowthMakeSure(_.nth(lookbackSixMonths, -1));
    let oneYearStart = fallbackGrowthMakeSure(_.nth(lookbackOneYear, 0)),
        oneYearEnd = fallbackGrowthMakeSure(_.nth(lookbackOneYear, -1));

    if (platform === "youtube") {
        let subsGrowth: ChannelGrowth = {
            oneDay: oneDayEnd["subscriberCount"] - oneDayStart["subscriberCount"],
            oneWeek: oneWeekEnd["subscriberCount"] - oneWeekStart["subscriberCount"],
            twoWeeks: twoWeeksEnd["subscriberCount"] - twoWeeksStart["subscriberCount"],
            oneMonth: oneMonthEnd["subscriberCount"] - oneMonthStart["subscriberCount"],
            sixMonths: sixMonthsEnd["subscriberCount"] - sixMonthsStart["subscriberCount"],
            oneYear: oneYearEnd["subscriberCount"] - oneYearStart["subscriberCount"],
            lastUpdated: oneDayEnd["timestamp"],
        }
        let viewsGrowth: ChannelGrowth = {
            oneDay: oneDayEnd["viewCount"] - oneDayStart["viewCount"],
            oneWeek: oneWeekEnd["viewCount"] - oneWeekStart["viewCount"],
            twoWeeks: twoWeeksEnd["viewCount"] - twoWeeksStart["viewCount"],
            oneMonth: oneMonthEnd["viewCount"] - oneMonthStart["viewCount"],
            sixMonths: sixMonthsEnd["viewCount"] - sixMonthsStart["viewCount"],
            oneYear: oneYearEnd["viewCount"] - oneYearStart["viewCount"],
            lastUpdated: oneDayEnd["timestamp"],
        }
        return {subscribersGrowth: fallbackGrowthIfNaN(subsGrowth), viewsGrowth: fallbackGrowthIfNaN(viewsGrowth)};
    } else if (platform === "twitcasting") {
        let subsGrowth: ChannelGrowth = {
            oneDay: oneDayEnd["followerCount"] - oneDayStart["followerCount"],
            oneWeek: oneWeekEnd["followerCount"] - oneWeekStart["followerCount"],
            twoWeeks: twoWeeksEnd["followerCount"] - twoWeeksStart["followerCount"],
            oneMonth: oneMonthEnd["followerCount"] - oneMonthStart["followerCount"],
            sixMonths: sixMonthsEnd["followerCount"] - sixMonthsStart["followerCount"],
            oneYear: oneYearEnd["followerCount"] - oneYearStart["followerCount"],
            lastUpdated: oneDayEnd["timestamp"],
        }
        return {subscribersGrowth: fallbackGrowthIfNaN(subsGrowth)};
    } else if (platform === "twitch") {
        let subsGrowth: ChannelGrowth = {
            oneDay: oneDayEnd["followerCount"] - oneDayStart["followerCount"],
            oneWeek: oneWeekEnd["followerCount"] - oneWeekStart["followerCount"],
            twoWeeks: twoWeeksEnd["followerCount"] - twoWeeksStart["followerCount"],
            oneMonth: oneMonthEnd["followerCount"] - oneMonthStart["followerCount"],
            sixMonths: sixMonthsEnd["followerCount"] - sixMonthsStart["followerCount"],
            oneYear: oneYearEnd["followerCount"] - oneYearStart["followerCount"],
            lastUpdated: oneDayEnd["timestamp"],
        }
        let viewsGrowth: ChannelGrowth = {
            oneDay: oneDayEnd["viewCount"] - oneDayStart["viewCount"],
            oneWeek: oneWeekEnd["viewCount"] - oneWeekStart["viewCount"],
            twoWeeks: twoWeeksEnd["viewCount"] - twoWeeksStart["viewCount"],
            oneMonth: oneMonthEnd["viewCount"] - oneMonthStart["viewCount"],
            sixMonths: sixMonthsEnd["viewCount"] - sixMonthsStart["viewCount"],
            oneYear: oneYearEnd["viewCount"] - oneYearStart["viewCount"],
            lastUpdated: oneDayEnd["timestamp"],
        }
        return {subscribersGrowth: fallbackGrowthIfNaN(subsGrowth), viewsGrowth: fallbackGrowthIfNaN(viewsGrowth)};
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

class Base64 {
    /**
     * Encode a string to base64 formaat
     * support memoizing for faster access.
     * @param data data to encode
     */
    @Memoize() encode(data: string) {
        const buf = Buffer.from(data, "utf-8");
        return buf.toString("base64");
    }

    /**
     * Decode back a base64 format string to normal string
     * @param encoded_data data to decode
     */
    @Memoize() decode(encoded_data: string) {
        const buf = Buffer.from(encoded_data, "base64");
        return buf.toString("utf-8");
    }
}

class VTAPIQuery {
    logger = TopLogger.child({cls: "VTAPIQuery"});

    async filterAndSortQueryResults(
        main_results: any[],
        args: LiveObjectParams,
        type: | "live" | "upcoming" | "past" | "channel" | "video"
    ): Promise<any[]> {
        let key_base =  getValueFromKey(args, "sort_by", "startTime");
        let order_by: SortOrder = getValueFromKey(args, "sort_order", "asc");
        let lookback_hours = fallbackNaN(parseInt, getValueFromKey(args, "max_lookback", 6), 6);
        if (lookback_hours > 24) {
            // limit to 24 hours
            lookback_hours = 6;
        }
        key_base = key_base.toLowerCase();
        let filtered_results = _.map(main_results, (value) => {
            if (type !== "channel" && value["status"] !== type) {
                return null;
            }
            return value;
        });
        // filter past stream with lookback
        if (type === "past") {
            let current_time = moment.tz("UTC").unix() - (lookback_hours * 60 * 60);
            filtered_results = _.map(filtered_results, (value) => {
                if (is_none(value)) {
                    return null;
                }
                if (current_time >= value["timeData"]["endTime"]) {
                    return null;
                } else {
                    return value;
                }
            })
        }
        filtered_results = filter_empty(filtered_results);
        filtered_results = sortObjectsByKey(filtered_results, key_base);
        if (order_by === "desc" || order_by === "descending") {
            filtered_results = filtered_results.reverse();
        }
        return filtered_results;
    }

    private remapGroupsData(groups: any[]) {
        if (is_none(groups)) {
            return null;
        }
        let allowedGroups = groups.map((group) => {
            let map: any[] = get_group(group);
            if (is_none(map)) {
                return [group];
            }
            return map;
        });
        return _.uniq(_.flattenDeep(allowedGroups));
    }

    private mapLiveResultToSchema(res: VideoProps): LiveObject {
        let timeObject = _.get(res, "timedata", {});
        let duration = calcDuration(_.get(timeObject, "duration", NaN), timeObject["startTime"], timeObject["endTime"]);
        let remapped: LiveObject = {
            id: res["id"],
            room_id: _.get(res, "room_id", null),
            title: res["title"],
            status: res["status"],
            timeData: {
                scheduledStartTime: is_none(_.get(timeObject, "scheduledStartTime", null)) ? null : timeObject["scheduledStartTime"],
                startTime: is_none(_.get(timeObject, "startTime", null)) ? null : timeObject["startTime"],
                endTime: is_none(_.get(timeObject, "endTime", null)) ? null : timeObject["endTime"],
                duration: duration,
                publishedAt: is_none(_.get(timeObject, "publishedAt", null)) ? null : timeObject["publishedAt"],
                lateBy: is_none(_.get(timeObject, "lateTime", null)) ? null : timeObject["lateTime"],
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
        }
        return remapped;
    }

    private mapChannelResultToSchema(res: ChannelsProps): ChannelObject {
        let subsCount = ["twitch", "twitcasting", "mildom"].includes(res["platform"]) ? res["followerCount"] : res["subscriberCount"];
        subsCount = is_none(subsCount) ? null : subsCount;
        let remapped: ChannelObject = {
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
            platform: res["platform"]
        }
        return remapped;
    }

    @Memoize()
    async performQueryOnLive(args: LiveObjectParams, type: LiveStatus, dataSources: VTAPIDataSources): Promise<IPaginateResults<LiveObject>> {
        // const logger = this.logger.child({fn: "performQueryOnLive"});
        let platforms_choices: string[] = getValueFromKey(args, "platforms", ["youtube", "bilibili", "twitch", "twitcasting", "mildom"]);
        if (!Array.isArray(platforms_choices)) {
            platforms_choices = ["youtube", "bilibili", "twitch", "twitcasting", "mildom"];
        }
        let groups_choices: string[] = getValueFromKey(args, "groups", null);
        let allowed_users: string[] = getValueFromKey(args, "channel_id", null);
        let max_lookforward = fallbackNaN(parseFloat, getValueFromKey(args, "max_scheduled_time", undefined), undefined);
        let max_lookback = fallbackNaN(parseInt, getValueFromKey(args, "max_lookback", 24), 24);
        if (max_lookback < 0 || max_lookback > 24) {
            max_lookback = 24;
        }
        if (!Array.isArray(allowed_users)) {
            allowed_users = null;
        } else if (Array.isArray(allowed_users)) {
            if (typeof allowed_users[0] !== "string") {
                allowed_users = null;
            }
        }
        let pageOpts: IPaginateOptions = {
            limit: fallbackNaN(parseInt, _.get(args, "limit", 25), 25),
            cursor: _.get(args, "cursor", undefined),
            sortBy: _.get(args, "sort_by", "timeData.startTime"),
            sortOrder: _.get(args, "sort_order", "asc"),
        }
        
        let raw_results = await dataSources.videos.getVideos(
            platforms_choices,
            type,
            {
                groups: this.remapGroupsData(groups_choices),
                channel_ids: allowed_users,
                max_lookforward: max_lookforward,
                max_lookback: max_lookback,
            },
            pageOpts
        );
        let main_results = raw_results.docs.map(this.mapLiveResultToSchema);
        let newPaged: IPaginateResults<LiveObject> = {
            docs: main_results,
            pageInfo: raw_results.pageInfo,
        }
        return newPaged;
    }

    @Memoize()
    async performQueryOnChannel(args: ChannelObjectParams, dataSources: VTAPIDataSources, parents: ChannelParents): Promise<IPaginateResults<ChannelObject>> {
        let user_ids_limit: string[] = getValueFromKey(parents, "channel_id", null) || getValueFromKey(args, "id", null);
        let platforms_choices: string[] = getValueFromKey(args, "platforms", ["youtube", "bilibili", "twitch", "twitcasting", "mildom"]);
        if (!Array.isArray(platforms_choices)) {
            platforms_choices = ["youtube", "bilibili", "twitch", "twitcasting", "mildom"];
        }
        if (!Array.isArray(user_ids_limit)) {
            user_ids_limit = null;
        } else if (Array.isArray(user_ids_limit)) {
            if (typeof user_ids_limit[0] !== "string") {
                user_ids_limit = null;
            }
        }
        let groups_choices: string[] = getValueFromKey(args, "groups", null);

        if (parents.force_single) {
            let singleChResult = await dataSources.channels.getChannels(
                ["youtube", "bilibili", "twitch", "twitcasting", "mildom"],
                {
                    channel_ids: user_ids_limit
                },
                {
                    sortBy: _.get(args, "sort_by", "publishedAt"),
                    sortOrder: _.get(args, "sort_order", "asc"),
                    limit: 5
                }
            )
            let singleChResMap = singleChResult.docs.map(this.mapChannelResultToSchema);
            return {
                docs: singleChResMap,
                pageInfo: singleChResult.pageInfo
            }
        }

        let pageOpts: IPaginateOptions = {
            limit: fallbackNaN(parseInt, _.get(args, "limit", 25), 25),
            cursor: _.get(args, "cursor", undefined),
            sortBy: _.get(args, "sort_by", "timeData.startTime"),
            sortOrder: _.get(args, "sort_order", "asc"),
        }

        let raw_results = await dataSources.channels.getChannels(
            platforms_choices,
            {
                channel_ids: user_ids_limit,
                groups: this.remapGroupsData(groups_choices),
            },
            pageOpts
        )
        let main_results = raw_results.docs.map(this.mapChannelResultToSchema);
        return {
            docs: main_results,
            pageInfo: raw_results.pageInfo,
        }
    }

    @Memoize()
    async performQueryOnChannelGrowth(dataSources: VTAPIDataSources, parents: ChannelParents) {
        const logger = this.logger.child({fn: "performQueryOnChannelGrowth"});
        let histStats = await dataSources.statsHist.getChannelHistory(parents.channel_id[0]).catch((err: any) => {
            logger.error(`Failed to perform parents growth on a ${parents.platform} ID: ${parents.channel_id[0]} (${err.toString()})`);
            return {"id": parents.channel_id[0], "history": [], "platform": parents.platform};
        });
        return mapGrowthData(parents.platform, histStats["id"], histStats["history"]);
    }

    @Memoize()
    async performGroupsFetch(dataSources: VTAPIDataSources): Promise<string[]> {
        const logger = this.logger.child({fn: "performGroupsFetch"});
        logger.info("Fetching groups data...")
        const stringResults = await dataSources.channels.getGroups();
        return stringResults;
    }
}

const VTPrefix = "vtapi-gqlcache";
function getCacheNameForLive(args: LiveObjectParams, type: LiveStatus): string {
    let groups_filters: string[] = getValueFromKey(args, "groups", []);
    let channels_filters: string[] = getValueFromKey(args, "channel_id", []);
    let platforms: string[] = getValueFromKey(args, "platforms", ["youtube", "bilibili", "twitch", "twitcasting", "mildom"]);
    let sortBy: string = "-sort_" + getValueFromKey(args, "sort_by", ["live", "upcoming"].includes(type) ? "timeData.startTime" : (type === "past" ? "timeData.endTime" : "timeData.publishedAt"));
    let sortOrder: SortOrder = getValueFromKey(args, "sort_order", "asc").toLowerCase();
    let curr: string = getValueFromKey(args, "cursor", "nocursor");
    let lookback: string = ""
    if (type === "past") {
        lookback = "-lb_" + fallbackNaN(parseInt, getValueFromKey(args, "max_lookback", 24), 24).toString();
    }
    let lookforward: string = ""
    if (type === "upcoming") {
        let lfData = fallbackNaN(parseInt, getValueFromKey(args, "max_scheduled_time", null), null);
        if (typeof lfData === "number") {
            lookforward = "-lf_" + lfData.toString();
        } else {
            lookforward = "-lf_nomax"
        }
    }
    if (curr.length < 1 || curr === " ") {
        curr = "nocursor";
    }
    curr = "-cur_" + curr;
    let limit: string = "-l" + fallbackNaN(parseInt, getValueFromKey(args, "limit", 25), 25).toString();
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
        final_name += "-nospecifics";
    } else {
        final_name += `-channels_${channels_filters.join("_")}`;
    }
    if (platforms.length < 1) {
        // not possible to get but okay.
        final_name += "-noplatforms";
    } else if (platforms.includes("youtube") && platforms.includes("bilibili") && platforms.includes("twitch") && platforms.includes("twitcasting") && platforms.includes("mildom")) {
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
            final_name += "twch_"
        }
        if (platforms.includes("twitcasting")) {
            final_name += "twcast_";
        }
        if (platforms.includes("mildom")) {
            final_name += "mildom_";
        }
        final_name = _.truncate(final_name, {omission: "", length: final_name.length - 1});
    }
    final_name += sortBy + "-ord_" + sortOrder + limit + lookforward + lookback + curr;
    return final_name;
}

function getCacheNameForChannels(args: ChannelObjectParams, type: | "channel" | "stats" | "singlech" | "growth", parent: ChannelObject = null) {
    let final_name = `${VTPrefix}-${type}`;
    if (type === "stats" || type === "growth") {
        final_name += `-platforms_${parent.platform}-ch_${parent.id}`;
        return final_name;
    }
    if (type === "singlech") {
        // @ts-ignore
        final_name += `-platforms_${parent.platform}-ch_${parent.channel_id}`;
        return final_name;
    }
    let groups_filters: string[] = getValueFromKey(args, "groups", []);
    let channels_filters: string[] = getValueFromKey(args, "id", []);
    let platforms: string[] = getValueFromKey(args, "platforms", ["youtube", "bilibili", "twitch", "twitcasting", "mildom"]);
    let sortBy: string = "-sort_" + getValueFromKey(args, "sort_by", "publishedAt");
    let sortOrder: SortOrder = getValueFromKey(args, "sort_order", "asc").toLowerCase();
    let curr: string = "-cur_" + getValueFromKey(args, "cursor", "nocursor");
    let limit: string = "-l" + fallbackNaN(parseInt, getValueFromKey(args, "limit", 25), 25).toString();
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
    } else if (platforms.includes("youtube") && platforms.includes("bilibili") && platforms.includes("twitch") && platforms.includes("twitcasting") && platforms.includes("mildom")) {
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
            final_name += "twch_"
        }
        if (platforms.includes("twitcasting")) {
            final_name += "twcast_";
        }
        if (platforms.includes("mildom")) {
            final_name += "mildom_";
        }
        final_name = _.truncate(final_name, {omission: "", length: final_name.length - 1});
    }
    final_name += sortBy + "-ord_" + sortOrder + limit + curr;
    return final_name;
}

// Initialize query class
const VTQuery = new VTAPIQuery();

// Create main resolvers
export const VTAPIv2Resolvers: IResolvers = {
    Query: {
        live: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            const logger = MainLogger.child({fn: "live"});
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 75) {
                limit = 75;
            }
            logger.info("Processing live()");
            logger.info("Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            let cache_name = getCacheNameForLive(args, "live");
            // @ts-ignore
            let [results, ttl]: [IPaginateResults<LiveObject>, number] = await ctx.cacheServers.getBetter(cache_name, true);
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
            let final_results: LivesResource = {
                _total: results.pageInfo.totalData,
                items: results.docs,
                pageInfo: {
                    total_results: results.docs.length,
                    results_per_page: limit,
                    nextCursor: results.pageInfo.nextCursor,
                    hasNextPage: results.pageInfo.hasNextPage,
                }
            };

            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 20, scope: 'PRIVATE'});
            return final_results;
        },
        upcoming: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 20, scope: 'PRIVATE'});
            const logger = MainLogger.child({fn: "upcoming"});
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 75) {
                limit = 75;
            }
            logger.info("Processing upcoming()");
            logger.info("Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            let cache_name = getCacheNameForLive(args, "upcoming");
            let [results, ttl]: [IPaginateResults<LiveObject>, number] = await ctx.cacheServers.getBetter(cache_name, true);
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
            let final_results: LivesResource = {
                _total: results.pageInfo.totalData,
                items: results.docs,
                pageInfo: {
                    total_results: results.docs.length,
                    results_per_page: limit,
                    nextCursor: results.pageInfo.nextCursor,
                    hasNextPage: results.pageInfo.hasNextPage,
                }
            };
            return final_results;
        },
        ended: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 300, scope: 'PRIVATE'});
            const logger = MainLogger.child({fn: "ended"});
            let cursor = getValueFromKey(args, "cursor", "");
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 75) {
                limit = 75;
            }
            logger.info("Processing ended()");
            logger.info("Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            let cache_name = getCacheNameForLive(args, "past");
            let [results, ttl]: [IPaginateResults<LiveObject>, number] = await ctx.cacheServers.getBetter(cache_name, true);
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
            let final_results: LivesResource = {
                _total: results.pageInfo.totalData,
                items: results.docs,
                pageInfo: {
                    total_results: results.docs.length,
                    results_per_page: limit,
                    nextCursor: results.pageInfo.nextCursor,
                    hasNextPage: results.pageInfo.hasNextPage,
                }
            };
            return final_results;
        },
        videos: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 1800, scope: 'PRIVATE'});
            const logger = MainLogger.child({fn: "videos"});
            let cursor = getValueFromKey(args, "cursor", "");
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 75) {
                limit = 75;
            }
            logger.info("Processing videos()");
            logger.info("Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            let cache_name = getCacheNameForLive(args, "video");
            let [results, ttl]: [IPaginateResults<LiveObject>, number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results) && !no_cache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnLive(args, "video", ctx.dataSources);
                logger.info(`Saving cache with name ${cache_name}, TTL 1800s...`);
                if (!no_cache && results.docs.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                    ctx.res.set("Cache-Control", "private, max-age=1800");
                }
            }
            let final_results: LivesResource = {
                _total: results.pageInfo.totalData,
                items: results.docs,
                pageInfo: {
                    total_results: results.docs.length,
                    results_per_page: limit,
                    nextCursor: results.pageInfo.nextCursor,
                    hasNextPage: results.pageInfo.hasNextPage,
                }
            };
            return final_results;
        },
        channels: async (_s, args: ChannelObjectParams, ctx: VTAPIContext, info): Promise<ChannelsResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 1800, scope: 'PRIVATE'});
            const logger = MainLogger.child({fn: "channels"});
            let cursor = getValueFromKey(args, "cursor", "");
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 75) {
                limit = 75;
            }
            logger.info("Processing channels()");
            logger.info("Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            let resetCache = map_bool(getValueFromKey(ctx.req.query, "resetcache", "0"));
            if (no_cache) {
                logger.info("No cache requested!");
            }
            let cache_name = getCacheNameForChannels(args, "channel");
            let [results, ttl]: [IPaginateResults<ChannelObject>, number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results) && !no_cache && !resetCache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnChannel(args, ctx.dataSources, {
                    "channel_id": args.id,
                    "type": "channel",
                    "force_single": false
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
            let final_results: ChannelsResource = {
                _total: results.pageInfo.totalData,
                items: results.docs,
                pageInfo: {
                    total_results: results.docs.length,
                    results_per_page: limit,
                    nextCursor: results.pageInfo.nextCursor,
                    hasNextPage: results.pageInfo.hasNextPage,
                }
            };
            return final_results;
        },
        groups: async (_s, _a, ctx: VTAPIContext, info): Promise<GroupsResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 300, scope: 'PRIVATE'});
            const logger = MainLogger.child({fn: "groups"});
            logger.info("Processing groups()");
            logger.info("Checking for cache...");
            let cache_name = "vtapi-groups-data";
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
            let final_results: GroupsResource = {
                "items": results
            };
            return final_results;
        }
    },
    ChannelObject: {
        growth: async (parent: ChannelObject, args: ChannelObjectParams, ctx: VTAPIContext, info): Promise<ChannelGrowthObject> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 1800, scope: "PRIVATE"});
            // const logger = MainLogger.child({fn: "ChannelObject.growth"});
            let no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            // @ts-ignore
            let cache_name = getCacheNameForChannels({}, "growth", parent);
            let [results, ttl]: [ChannelGrowthObject, number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (is_none(results)) {
                results = await VTQuery.performQueryOnChannelGrowth(ctx.dataSources, {
                    // @ts-ignore
                    "channel_id": [parent.id],
                    "platform": parent.platform
                });
                ttl = 1800
                if (results.subscribersGrowth !== null || results.viewsGrowth !== null) {
                    if (!no_cache) {
                        await ctx.cacheServers.setexBetter(cache_name, ttl, results);
                    }
                }
                if (no_cache) {
                    ttl = 0;
                }
            }
            ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            return results;
        }
    },
    LiveObject: {
        channel: async (parent: LiveObject, args: ChannelObjectParams, ctx: VTAPIContext, info): Promise<ChannelObject> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 1800, scope: 'PRIVATE'});
            const logger = MainLogger.child({fn: "LiveObject.channel"});
            let no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            // @ts-ignore
            let cache_name = getCacheNameForChannels({}, "singlech", parent);
            let [results, ttl]: [IPaginateResults<ChannelObject>, number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (is_none(results)) {
                results = await VTQuery.performQueryOnChannel(args, ctx.dataSources, {
                    // @ts-ignore
                    "channel_id": [parent.channel_id],
                    "force_single": true,
                    "type": "channel",
                    "group": parent.group,
                    "platform": parent.platform
                });
                if (!no_cache && results.docs.length > 0) {
                    // dont cache for reason.
                    ttl = 1800
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                }
            }
            if (results.docs.length < 1) {
                logger.error(`Failed to fetch ${parent.platform} ${parent.channel_id} ${parent.group}`);
                return null;
            }
            ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            return results.docs[0];
        }
    },
    DateTime: DateTimeScalar
}