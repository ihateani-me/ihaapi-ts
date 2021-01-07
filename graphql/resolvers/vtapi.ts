import _ from "lodash";
import 'apollo-cache-control';

// Import models
import { Memoize } from "../../utils/decorators";
import { get_group } from "../../utils/filters";
import { IResolvers } from "apollo-server-express";
import {
    LiveObject,
    ChannelObject,
    ChannelStatistics,
    LiveObjectParams,
    ChannelObjectParams,
    LiveStatus,
    PlatformName,
    DateTimeScalar,
    LivesResource,
    ChannelsResource,
    SortOrder,
    ChannelGrowth
} from "../schemas";
import {
    YoutubeDocument,
    VTAPIDataSources
} from "../datasources";
import { CustomRedisCache } from "../caches/redis";
import { fallbackNaN, filter_empty, getValueFromKey, is_none, map_bool, sortObjectsByKey } from "../../utils/swissknife";
import { Buffer } from "buffer";
import express from "express";
import moment from "moment-timezone";
import { logger as TopLogger } from "../../utils/logger";

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

interface GrowthChannelData {
    subscribersGrowth?: ChannelGrowth
    viewsGrowth?: ChannelGrowth
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

function mapGrowthData(platform: PlatformName, channelId: string, historyData?: HistoryGrowthData[]): GrowthChannelData {
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
                return [];
            }
            return map;
        });
        return _.uniq(_.flattenDeep(allowedGroups));
    }

    @Memoize()
    async performQueryOnLive(args: LiveObjectParams, type: LiveStatus, dataSources: VTAPIDataSources): Promise<LiveObject[]> {
        const logger = this.logger.child({fn: "performQueryOnLive"});
        let platforms_choices: string[] = getValueFromKey(args, "platforms", ["youtube", "bilibili", "twitch", "twitcasting"]);
        let groups_choices: string[] = getValueFromKey(args, "groups", null);
        let allowed_users: string[] = getValueFromKey(args, "channel_id", null);
        if (!Array.isArray(allowed_users)) {
            allowed_users = null;
        } else if (Array.isArray(allowed_users)) {
            if (typeof allowed_users[0] !== "string") {
                allowed_users = null;
            }
        }
        let main_results: LiveObject[] = [];
        if (platforms_choices.includes("youtube")) {
            let youtubeLiveFetch = await dataSources.youtubeLive.getLive(type, allowed_users, this.remapGroupsData(groups_choices));
            let ytMapped = youtubeLiveFetch.map((res) => {
                let duration = calcDuration(res["timedata"]["duration"], res["timedata"]["startTime"], res["timedata"]["endTime"]);
                let remap: LiveObject = {
                    "id": res["id"],
                    "title": res["title"],
                    // @ts-ignore
                    "status": res["status"],
                    "timeData": {
                        "startTime": res["timedata"]["startTime"],
                        "endTime": res["timedata"]["endTime"],
                        "publishedAt": res["timedata"]["publishedAt"],
                        "scheduledStartTime": res["timedata"]["scheduledStartTime"],
                        "duration": duration,
                        "lateBy": res["timedata"]["lateTime"],
                    },
                    "channel_id": res["channel_id"],
                    "viewers": type === "video" ? null : res["viewers"], // force null
                    "peakViewers": res["peakViewers"],
                    "averageViewers": _.get(res, "averageViewers", null),
                    "is_missing": is_none(_.get(res, "is_missing", null)) ? null : res["is_missing"],
                    "is_premiere": is_none(_.get(res, "is_premiere", null)) ? null : res["is_premiere"],
                    "is_member": is_none(_.get(res, "is_member", null)) ? null : res["is_member"],
                    "thumbnail": res["thumbnail"],
                    "group": res["group"],
                    "platform": "youtube"
                };
                return remap;
            })
            main_results = _.concat(main_results, ytMapped);
        }
        if (platforms_choices.includes("bilibili")) {
            let b2LiveFetch = await dataSources.biliLive.getLive(type, allowed_users, this.remapGroupsData(groups_choices));
            let b2Mapped = b2LiveFetch.map((res) => {
                let duration = calcDuration(NaN, res["startTime"], res["endTime"]);
                let remap: LiveObject = {
                    "id": res["id"],
                    "room_id": res["room_id"],
                    "title": res["title"],
                    // @ts-ignore
                    "status": res["status"],
                    "timeData": {
                        "startTime": res["startTime"],
                        "endTime": res["endTime"],
                        "duration": duration,
                    },
                    "channel_id": res["channel_id"],
                    "viewers": res["viewers"],
                    "peakViewers": res["peakViewers"],
                    "thumbnail": res["thumbnail"],
                    "is_missing": is_none(_.get(res, "is_missing", null)) ? null : res["is_missing"],
                    "is_premiere": is_none(_.get(res, "is_premiere", null)) ? null : res["is_premiere"],
                    "group": res["group"],
                    "platform": "bilibili"
                }
                return remap;
            })
            main_results = _.concat(main_results, b2Mapped);
        }
        if (platforms_choices.includes("twitcasting") && ["live", "past"].includes(type)) {
            let twcastLiveFetch = await dataSources.twitcastingLive.getLive(type, allowed_users, this.remapGroupsData(groups_choices));
            let twMapped = twcastLiveFetch.map((res) => {
                let duration = calcDuration(res["timedata"]["duration"], res["timedata"]["startTime"], res["timedata"]["endTime"]);
                let remap: LiveObject = {
                    "id": res["id"],
                    "title": res["title"],
                    // @ts-ignore
                    "status": res["status"],
                    "timeData": {
                        "startTime": res["timedata"]["startTime"],
                        "endTime": res["timedata"]["endTime"],
                        "publishedAt": res["timedata"]["publishedAt"],
                        "duration": duration,
                    },
                    "channel_id": res["channel_id"],
                    "viewers": res["viewers"],
                    "peakViewers": res["peakViewers"],
                    "averageViewers": _.get(res, "averageViewers", null),
                    "thumbnail": res["thumbnail"],
                    "is_missing": is_none(_.get(res, "is_missing", null)) ? null : res["is_missing"],
                    "is_premiere": is_none(_.get(res, "is_premiere", null)) ? null : res["is_premiere"],
                    "is_member": is_none(_.get(res, "is_member", null)) ? null : res["is_member"],
                    "group": res["group"],
                    "platform": "twitcasting"
                }
                return remap;
            })
            main_results = _.concat(main_results, twMapped);
        }
        if (platforms_choices.includes("twitch") && ["live", "past"].includes(type)) {
            let ttvLiveFetch = await dataSources.twitchLive.getLive(type, allowed_users, this.remapGroupsData(groups_choices));
            let ttvMapped = ttvLiveFetch.map((res) => {
                let duration = calcDuration(res["timedata"]["duration"], res["timedata"]["startTime"], res["timedata"]["endTime"]);
                let remap: LiveObject = {
                    "id": res["id"],
                    "title": res["title"],
                    // @ts-ignore
                    "status": res["status"],
                    "timeData": {
                        "startTime": res["timedata"]["startTime"],
                        "endTime": res["timedata"]["endTime"],
                        "publishedAt": res["timedata"]["publishedAt"],
                        "duration": duration,
                    },
                    "channel_id": res["channel_id"],
                    "viewers": res["viewers"],
                    "peakViewers": res["peakViewers"],
                    "averageViewers": _.get(res, "averageViewers", null),
                    "thumbnail": res["thumbnail"],
                    "is_missing": is_none(_.get(res, "is_missing", null)) ? null : res["is_missing"],
                    "is_premiere": is_none(_.get(res, "is_premiere", null)) ? null : res["is_premiere"],
                    "group": res["group"],
                    "platform": "twitch"
                }
                return remap;
            })
            main_results = _.concat(main_results, ttvMapped);
        }
        return main_results;
    }

    @Memoize()
    async performQueryOnChannel(args: ChannelObjectParams, dataSources: VTAPIDataSources, parents: ChannelParents): Promise<ChannelObject[]> {
        const logger = this.logger.child({fn: "performQueryOnChannel"});
        let user_ids_limit: string[] = getValueFromKey(parents, "channel_id", null) || getValueFromKey(args, "id", null);
        if (!Array.isArray(user_ids_limit)) {
            user_ids_limit = null;
        } else if (Array.isArray(user_ids_limit)) {
            if (typeof user_ids_limit[0] !== "string") {
                user_ids_limit = null;
            }
        }
        let groups_choices: string[] = getValueFromKey(args, "groups", null);

        if (parents.force_single) {
            if (parents.platform === "youtube") {
                let ytUsers = await dataSources.youtubeChannels.getChannel(user_ids_limit);
                let remappedData: ChannelObject[] = ytUsers.map((res) => {
                    let remap: ChannelObject = {
                        id: res["id"],
                        name: res["name"],
                        description: res["description"],
                        publishedAt: res["publishedAt"],
                        image: res["thumbnail"],
                        group: res["group"],
                        statistics: {
                            subscriberCount: res["subscriberCount"],
                            viewCount: res["viewCount"],
                            videoCount: res["videoCount"],
                            level: null
                        },
                        growth: mapGrowthData("youtube", res["id"], res["history"]),
                        platform: "youtube"
                    }
                    return remap;
                })
                return remappedData;
            } else if (parents.platform === "bilibili") {
                let biliUsers = await dataSources.biliChannels.getChannels(user_ids_limit);
                let remappedData: ChannelObject[] = biliUsers.map((res) => {
                    let remap: ChannelObject = {
                        id: res["id"],
                        room_id: res["room_id"],
                        name: res["name"],
                        description: res["description"],
                        publishedAt: res["publishedAt"],
                        image: res["thumbnail"],
                        statistics: {
                            subscriberCount: res["subscriberCount"],
                            viewCount: res["viewCount"],
                            videoCount: res["videoCount"],
                            level: null
                        },
                        is_live: res["live"],
                        group: res["group"],
                        platform: "bilibili"
                    }
                    return remap;
                })
                return remappedData;
            } else if (parents.platform === "twitcasting") {
                let twUsers = await dataSources.twitcastingChannels.getChannels(user_ids_limit);
                let remappedData: ChannelObject[] = twUsers.map((res) => {
                    let remap: ChannelObject = {
                        id: res["id"],
                        name: res["name"],
                        description: res["description"],
                        statistics: {
                            subscriberCount: res["followerCount"],
                            viewCount: null,
                            videoCount: null,
                            level: res["level"]
                        },
                        growth: mapGrowthData("twitcasting", res["id"], res["history"]),
                        image: res["thumbnail"],
                        group: res["group"],
                        platform: "twitcasting"
                    }
                    return remap;
                })
                return remappedData;
            } else if (parents.platform === "twitch") {
                let ttvUsers = await dataSources.twitchChannels.getChannels(user_ids_limit);
                let remappedData: ChannelObject[] = ttvUsers.map((res) => {
                    let remap: ChannelObject = {
                        id: res["id"],
                        user_id: res["user_id"],
                        name: res["name"],
                        description: res["description"],
                        publishedAt: res["publishedAt"],
                        statistics: {
                            subscriberCount: res["followerCount"],
                            viewCount: res["viewCount"],
                            videoCount: res["videoCount"],
                            level: null
                        },
                        growth: mapGrowthData("twitch", res["id"], res["history"]),
                        image: res["thumbnail"],
                        group: res["group"],
                        platform: "twitch"
                    }
                    return remap;
                })
                return remappedData;
            }
        }

        let platforms_choices: string[] = getValueFromKey(args, "platforms", ["youtube", "bilibili", "twitch", "twitcasting"]);

        let combined_channels: ChannelObject[] = [];
        if (platforms_choices.includes("youtube")) {
            logger.info("fetching youtube channels stats...");
            let ytUsers = await dataSources.youtubeChannels.getChannel(user_ids_limit, this.remapGroupsData(groups_choices));
            logger.info("processing youtube channels stats...");
            let remappedData: ChannelObject[] = ytUsers.map((res) => {
                let remap: ChannelObject = {
                    id: res["id"],
                    name: res["name"],
                    description: res["description"],
                    publishedAt: res["publishedAt"],
                    statistics: {
                        subscriberCount: res["subscriberCount"],
                        viewCount: res["viewCount"],
                        videoCount: res["videoCount"],
                        level: null
                    },
                    growth: mapGrowthData("youtube", res["id"], res["history"]),
                    image: res["thumbnail"],
                    group: res["group"],
                    platform: "youtube"
                }
                return remap;
            })
            combined_channels = _.concat(combined_channels, remappedData);
        }
        if (platforms_choices.includes("bilibili")) {
            logger.info("fetching bilibili channels staats...");
            let biliUsers = await dataSources.biliChannels.getChannels(user_ids_limit, this.remapGroupsData(groups_choices));
            logger.info("processing bilibili channels staats...");
            let remappedData: ChannelObject[] = biliUsers.map((res) => {
                let remap: ChannelObject = {
                    id: res["id"],
                    room_id: res["room_id"],
                    name: res["name"],
                    description: res["description"],
                    statistics: {
                        subscriberCount: res["subscriberCount"],
                        viewCount: res["viewCount"],
                        videoCount: res["videoCount"],
                        level: null
                    },
                    publishedAt: res["publishedAt"],
                    image: res["thumbnail"],
                    is_live: res["live"],
                    group: res["group"],
                    platform: "bilibili"
                }
                return remap;
            })
            combined_channels = _.concat(combined_channels, remappedData);
        }
        if (platforms_choices.includes("twitcasting")) {
            logger.info("fetching twitcasting channels staats...");
            let twUsers = await dataSources.twitcastingChannels.getChannels(user_ids_limit, this.remapGroupsData(groups_choices));
            logger.info("processing twitcasting channels staats...");
            let remappedData: ChannelObject[] = twUsers.map((res) => {
                let remap: ChannelObject = {
                    id: res["id"],
                    name: res["name"],
                    description: res["description"],
                    statistics: {
                        subscriberCount: res["followerCount"],
                        viewCount: null,
                        videoCount: null,
                        level: res["level"]
                    },
                    growth: mapGrowthData("twitcasting", res["id"], res["history"]),
                    image: res["thumbnail"],
                    group: res["group"],
                    platform: "twitcasting"
                }
                return remap;
            })
            combined_channels = _.concat(combined_channels, remappedData);
        }
        if (platforms_choices.includes("twitch")) {
            logger.info("fetching twitch channels staats...");
            let ttvUsers = await dataSources.twitchChannels.getChannels(user_ids_limit);
            logger.info("processing twitch channels staats...");
            let remappedData: ChannelObject[] = ttvUsers.map((res) => {
                let remap: ChannelObject = {
                    id: res["id"],
                    user_id: res["user_id"],
                    name: res["name"],
                    description: res["description"],
                    publishedAt: res["publishedAt"],
                    statistics: {
                        subscriberCount: res["followerCount"],
                        viewCount: res["viewCount"],
                        videoCount: res["videoCount"],
                        level: null
                    },
                    growth: mapGrowthData("twitch", res["id"], res["history"]),
                    image: res["thumbnail"],
                    group: res["group"],
                    platform: "twitch"
                }
                return remap;
            })
            combined_channels = _.concat(combined_channels, remappedData);
        }
        return combined_channels;
    }

    @Memoize()
    async performQueryOnChannelStats(dataSources: VTAPIDataSources, parents: ChannelParents): Promise<ChannelStatistics> {
        const logger = this.logger.child({fn: "performQueryOnChannelStats"});
        if (parents.platform === "youtube") {
            let defaults: ChannelStatistics = {subscriberCount: 0, viewCount: null, videoCount: null, level: 0};
            let ytStats = await dataSources.youtubeChannels.getChannelStats(parents.channel_id).catch(() => {
                logger.error("Failed to perform parents statistics on youtube ID: ", parents.channel_id[0]);
                let ret: YoutubeDocument<ChannelStatistics> = {};
                ret[parents.channel_id[0]] = defaults;
                return ret;
            });
            return _.get(ytStats, parents.channel_id[0], defaults);
        } else if (parents.platform === "bilibili") {
            let defaults: ChannelStatistics = {subscriberCount: 0, viewCount: null, videoCount: null, level: 0};
            let biliStats = await dataSources.biliChannels.getChannelStats(parents.channel_id).catch(() => {
                logger.error("Failed to perform parents statistics on youtube ID: ", parents.channel_id[0]);
                let ret: YoutubeDocument<ChannelStatistics> = {};
                ret[parents.channel_id[0]] = defaults;
                return ret;
            });
            return _.get(biliStats, parents.channel_id[0], defaults);
        } else if (parents.platform === "twitcasting") {
            let defaults: ChannelStatistics = {subscriberCount: 0, viewCount: null, videoCount: null, level: 0};
            let twStats = await dataSources.twitcastingChannels.getChannelStats(parents.channel_id).catch(() => {
                logger.error("Failed to perform parents statistics on youtube ID: ", parents.channel_id[0]);
                let ret: YoutubeDocument<ChannelStatistics> = {};
                ret[parents.channel_id[0]] = defaults;
                return ret;
            });
            return _.get(twStats, parents.channel_id[0], defaults);
        } else if (parents.platform === "twitch") {
            let defaults: ChannelStatistics = {subscriberCount: 0, viewCount: null, videoCount: null, level: 0};
            let ttvStats = await dataSources.twitchChannels.getChannelStats(parents.channel_id).catch(() => {
                logger.error("Failed to perform parents statistics on youtube ID: ", parents.channel_id[0]);
                let ret: YoutubeDocument<ChannelStatistics> = {};
                ret[parents.channel_id[0]] = defaults;
                return ret;
            });
            return _.get(ttvStats, parents.channel_id[0], defaults);
        }
        return null;
    }
}

const VTPrefix = "vtapi-gqlcache";
function getCacheNameForLive(args: LiveObjectParams, type: LiveStatus): string {
    let groups_filters: string[] = getValueFromKey(args, "groups", []);
    let channels_filters: string[] = getValueFromKey(args, "channel_id", []);
    let platforms: string[] = getValueFromKey(args, "platforms", ["youtube", "bilibili", "twitch", "twitcasting"]);
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
    } else if (platforms.includes("youtube") && platforms.includes("bilibili") && platforms.includes("twitch") && platforms.includes("twitcasting")) {
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
        final_name = _.truncate(final_name, {omission: "", length: final_name.length - 1});
    }
    return final_name;
}

function getCacheNameForChannels(args: ChannelObjectParams, type: | "channel" | "stats" | "singlech", parent: ChannelObject = null) {
    let final_name = `${VTPrefix}-${type}`;
    if (type === "stats") {
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
    let platforms: string[] = getValueFromKey(args, "platforms", ["youtube", "bilibili", "twitch", "twitcasting"]);
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
    } else if (platforms.includes("youtube") && platforms.includes("bilibili") && platforms.includes("twitch") && platforms.includes("twitcasting")) {
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
        final_name = _.truncate(final_name, {omission: "", length: final_name.length - 1});
    }
    return final_name;
}

// Initialize query class
const VTQuery = new VTAPIQuery();

// Create main resolvers
export const VTAPIv2Resolvers: IResolvers = {
    Query: {
        live: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            const logger = MainLogger.child({fn: "live"});
            let cursor = getValueFromKey(args, "cursor", "");
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 75) {
                limit = 75;
            }
            logger.info("Processing live()");
            logger.info("Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            let cache_name = getCacheNameForLive(args, "live");
            // @ts-ignore
            let [results, ttl]: [LiveObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results) && !no_cache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnLive(args, "live", ctx.dataSources);
                logger.info(`Saving cache with name ${cache_name}, TTL 20s...`);
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 20, results);
                    ctx.res.set("Cache-Control", "private, max-age=20");
                }
            }
            results = await VTQuery.filterAndSortQueryResults(
                results,
                args,
                "live"
            )
            // @ts-ignore
            let final_results: LivesResource = {};
            let total_results = results.length;
            const b64 = new Base64();
            if (cursor !== "") {
                logger.info("Using cursor to filter results...");
                let unbase64cursor = b64.decode(cursor);
                logger.info(`Finding cursor index: ${unbase64cursor}`);
                let findIndex = _.findIndex(results, (o) => {return o.id === unbase64cursor});
                logger.info(`Using cursor index: ${findIndex}`);
                let limitres = results.length;
                let max_limit = findIndex + limit;
                let hasnextpage = true;
                let next_cursor = null;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    logger.info(`Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        logger.info(`Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        logger.info(`Next available cursor: None`);
                        hasnextpage = false;
                    }
                    
                }
                results = _.slice(results, findIndex, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: results.length > 0 ? next_cursor : null,
                    hasNextPage: results.length > 0 ? hasnextpage : false,
                };
            } else {
                logger.info(`Starting cursor from zero.`);
                let limitres = results.length;
                let hasnextpage = true;
                let next_cursor: string = null;
                let max_limit = limit;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    logger.info(`Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        logger.info(`Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        logger.info(`Next available cursor: None`);
                        hasnextpage = false;
                    }
                }
                results = _.slice(results, 0, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: results.length > 0 ? next_cursor : null,
                    hasNextPage: results.length > 0 ? hasnextpage : false,
                };
            }
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 20, scope: 'PRIVATE'});
            final_results["_total"] = total_results;
            return final_results;
        },
        upcoming: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 20, scope: 'PRIVATE'});
            const logger = MainLogger.child({fn: "upcoming"});
            let cursor = getValueFromKey(args, "cursor", "");
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 75) {
                limit = 75;
            }
            logger.info("Processing upcoming()");
            logger.info("Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req.query, "nocache", "0"));
            let cache_name = getCacheNameForLive(args, "upcoming");
            // @ts-ignore
            let [results, ttl]: [LiveObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results) && !no_cache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnLive(args, "upcoming", ctx.dataSources);
                logger.info(`Saving cache with name ${cache_name}, TTL 20s...`);
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 20, results);
                    ctx.res.set("Cache-Control", "private, max-age=20");
                }
            }
            results = await VTQuery.filterAndSortQueryResults(
                results,
                args,
                "upcoming"
            )
            // @ts-ignore
            let final_results: LivesResource = {};
            let total_results = results.length;
            const b64 = new Base64();
            if (cursor !== "") {
                logger.info("Using cursor to filter results...");
                let unbase64cursor = b64.decode(cursor);
                logger.info(`Finding cursor index: ${unbase64cursor}`);
                let findIndex = _.findIndex(results, (o) => {return o.id === unbase64cursor});
                logger.info(`Using cursor index: ${findIndex}`);
                let limitres = results.length;
                let max_limit = findIndex + limit;
                let hasnextpage = true;
                let next_cursor = null;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    logger.info(`Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        logger.info(`Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        logger.info(`Next available cursor: None`);
                        hasnextpage = false;
                    }
                    
                }
                results = _.slice(results, findIndex, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: results.length > 0 ? next_cursor : null,
                    hasNextPage: results.length > 0 ? hasnextpage : false,
                };
            } else {
                logger.info(`Starting cursor from zero.`);
                let limitres = results.length;
                let hasnextpage = true;
                let next_cursor: string = null;
                let max_limit = limit;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    logger.info(`Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        logger.info(`Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        logger.info(`Next available cursor: None`);
                        hasnextpage = false;
                    }
                }
                results = _.slice(results, 0, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: results.length > 0 ? next_cursor : null,
                    hasNextPage: results.length > 0 ? hasnextpage : false,
                };
            }
            final_results["_total"] = total_results;
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
            // @ts-ignore
            let [results, ttl]: [LiveObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results) && !no_cache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnLive(args, "past", ctx.dataSources);
                logger.info(`Saving cache with name ${cache_name}, TTL 300s...`);
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 300, results);
                    ctx.res.set("Cache-Control", "private, max-age=300");
                }
            }
            results = await VTQuery.filterAndSortQueryResults(
                results,
                args,
                "past"
            )
            // @ts-ignore
            let final_results: LivesResource = {};
            let total_results = results.length;
            const b64 = new Base64();
            if (cursor !== "") {
                logger.info("Using cursor to filter results...");
                let unbase64cursor = b64.decode(cursor);
                logger.info(`Finding cursor index: ${unbase64cursor}`);
                let findIndex = _.findIndex(results, (o) => {return o.id === unbase64cursor});
                logger.info(`Using cursor index: ${findIndex}`);
                let limitres = results.length;
                let max_limit = findIndex + limit;
                let hasnextpage = true;
                let next_cursor = null;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    logger.info(`Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        logger.info(`Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        logger.info(`Next available cursor: None`);
                        hasnextpage = false;
                    }
                    
                }
                results = _.slice(results, findIndex, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: results.length > 0 ? next_cursor : null,
                    hasNextPage: results.length > 0 ? hasnextpage : false,
                };
            } else {
                logger.info(`Starting cursor from zero.`);
                let limitres = results.length;
                let hasnextpage = true;
                let next_cursor: string = null;
                let max_limit = limit;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    logger.info(`Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        logger.info(`Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        logger.info(`Next available cursor: None`);
                        hasnextpage = false;
                    }
                }
                results = _.slice(results, 0, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: results.length > 0 ? next_cursor : null,
                    hasNextPage: results.length > 0 ? hasnextpage : false,
                };
            }
            final_results["_total"] = total_results;
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
            // @ts-ignore
            let [results, ttl]: [LiveObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results) && !no_cache) {
                logger.info(`Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                logger.info("Missing cache, requesting manually...");
                logger.info(`Arguments -> ${JSON.stringify(args, null, 4)}`);
                results = await VTQuery.performQueryOnLive(args, "video", ctx.dataSources);
                logger.info(`Saving cache with name ${cache_name}, TTL 1800s...`);
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                    ctx.res.set("Cache-Control", "private, max-age=1800");
                }
            }
            results = await VTQuery.filterAndSortQueryResults(
                results,
                args,
                "video"
            )
            // @ts-ignore
            let final_results: LivesResource = {};
            let total_results = results.length;
            const b64 = new Base64();
            if (cursor !== "") {
                logger.info("Using cursor to filter results...");
                let unbase64cursor = b64.decode(cursor);
                logger.info(`Finding cursor index: ${unbase64cursor}`);
                let findIndex = _.findIndex(results, (o) => {return o.id === unbase64cursor});
                logger.info(`Using cursor index: ${findIndex}`);
                let limitres = results.length;
                let max_limit = findIndex + limit;
                let hasnextpage = true;
                let next_cursor = null;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    logger.info(`Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        logger.info(`Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        logger.info(`Next available cursor: None`);
                        hasnextpage = false;
                    }
                    
                }
                results = _.slice(results, findIndex, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: results.length > 0 ? next_cursor : null,
                    hasNextPage: results.length > 0 ? hasnextpage : false,
                };
            } else {
                logger.info(`Starting cursor from zero.`);
                let limitres = results.length;
                let hasnextpage = true;
                let next_cursor: string = null;
                let max_limit = limit;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    logger.info(`Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        logger.info(`Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        logger.info(`Next available cursor: None`);
                        hasnextpage = false;
                    }
                }
                results = _.slice(results, 0, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: results.length > 0 ? next_cursor : null,
                    hasNextPage: results.length > 0 ? hasnextpage : false,
                };
            }
            final_results["_total"] = total_results;
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
            // @ts-ignore
            let [results, ttl]: [ChannelObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
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
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                    ctx.res.set("Cache-Control", "private, max-age=1800");
                } else if (resetCache && results.length) {
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                    ctx.res.set("Cache-Control", "private, max-age=1800");
                }
            }
            results = await VTQuery.filterAndSortQueryResults(
                results,
                args,
                "channel"
            )
            // @ts-ignore
            let final_results: ChannelsResource = {};
            let total_results = results.length;
            const b64 = new Base64();
            if (cursor !== "") {
                logger.info("Using cursor to filter results...");
                let unbase64cursor = b64.decode(cursor);
                logger.info(`Finding cursor index: ${unbase64cursor}`);
                let findIndex = _.findIndex(results, (o) => {return o.id === unbase64cursor});
                logger.info(`Using cursor index: ${findIndex}`);
                let limitres = results.length;
                let max_limit = findIndex + limit;
                let hasnextpage = true;
                let next_cursor = null;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    logger.info(`Next available cursor: None`);
                } else {
                    try {
                        let next_data: ChannelObject = _.nth(results, max_limit);
                        // @ts-ignore
                        next_cursor = b64.encode(next_data["id"]);
                        logger.info(`Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        logger.info(`Next available cursor: None`);
                        hasnextpage = false;
                    }
                    
                }
                results = _.slice(results, findIndex, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: results.length > 0 ? next_cursor : null,
                    hasNextPage: results.length > 0 ? hasnextpage : false,
                };
            } else {
                logger.info(`Starting cursor from zero.`);
                let limitres = results.length;
                let hasnextpage = true;
                let next_cursor: string = null;
                let max_limit = limit;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    logger.info(`Next available cursor: None`);
                } else {
                    try {
                        let next_data: ChannelObject = _.nth(results, max_limit);
                        // @ts-ignore
                        next_cursor = b64.encode(next_data["id"]);
                        logger.info(`Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        logger.info(`Next available cursor: None`);
                        hasnextpage = false;
                    }
                }
                results = _.slice(results, 0, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: results.length > 0 ? next_cursor : null,
                    hasNextPage: results.length > 0 ? hasnextpage : false,
                };
            }
            final_results["_total"] = total_results;
            return final_results;
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
            // @ts-ignore
            let [results, ttl]: [ChannelObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (is_none(results)) {
                results = await VTQuery.performQueryOnChannel(args, ctx.dataSources, {
                    // @ts-ignore
                    "channel_id": [parent.channel_id],
                    "force_single": true,
                    "type": "channel",
                    "group": parent.group,
                    "platform": parent.platform
                });
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    ttl = 1800
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                }
            }
            if (results.length < 1) {
                logger.error(`Failed to fetch ${parent.platform} ${parent.channel_id} ${parent.group}`);
            }
            ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            return results[0];
        }
    },
    DateTime: DateTimeScalar
}