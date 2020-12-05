import _ from "lodash";
import 'apollo-cache-control';

// Import models
import { Memoize } from "../../utils/decorators";
import { get_group } from "../../utils/filters";
import { RedisDB } from "../../dbconn";
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
    SortOrder
} from "../schemas";
import {
    YoutubeLiveData,
    YoutubeChannelData,
    YoutubeDocument,
    BiliBiliLive,
    BiliBiliChannel,
    TwitchLiveData,
    TwitchChannelData,
    TwitchChannelDocument,
    TwitcastingLiveData,
    TwitcastingChannelData,
    TwitcastingChannelDocument,
    VTAPIDataSources
} from "../datasources";
import { CustomRedisCache } from "../caches/redis";
import { filter_empty, getValueFromKey, hasKey, is_none, map_bool, sortObjectsByKey } from "../../utils/swissknife";
import { Buffer } from "buffer";
import express from "express";

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

function anyNijiGroup(group_choices: string[]) {
    if (is_none(group_choices) || group_choices.length == 0) {
        return true; // force true if no groups defined.
    }
    if (
        group_choices.includes("nijisanji") ||
        group_choices.includes("nijisanjijp") ||
        group_choices.includes("nijisanjikr") ||
        group_choices.includes("nijisanjiid") ||
        group_choices.includes("nijisanjiin") ||
        group_choices.includes("nijisanjien") ||
        group_choices.includes("nijisanjiworld") ||
        group_choices.includes("virtuareal")
    ) {
        return true;
    }
    return false;
}

function anyHoloProGroup(groups_choices: string[]) {
    if (is_none(groups_choices) || groups_choices.length == 0) {
        return true; // force true if no groups defined.
    }
    if (
        groups_choices.includes("holopro") ||
        groups_choices.includes("hololive") ||
        groups_choices.includes("hololivejp") ||
        groups_choices.includes("hololiveen") ||
        groups_choices.includes("hololiveid") ||
        groups_choices.includes("holostars")
    ) {
        return true;
    }
    return false;
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
    async sortQueryResults(
        main_results: any[],
        groups_filters: string[],
        key_base: string,
        order_by: SortOrder,
        type: | "live" | "upcoming" | "past" | "channel"
    ): Promise<any[]> {
        key_base = key_base.toLowerCase()
        let allowed_groups = [];
        if (!is_none(groups_filters) && groups_filters.length > 0) {
            groups_filters.forEach((value) => {
                let groups_map = get_group(value);
                if (groups_map) {
                    allowed_groups = allowed_groups.concat(groups_map);
                }
            })
        }
        let filtered_results = _.map(main_results, (value) => {
            if (type !== "channel" && value["status"] !== type) {
                return null;
            }
            if (allowed_groups.length == 0) {
                return value;
            }
            if (hasKey(value, "group")) {
                if (is_none(value["group"])) {
                    // just add that have missing group for now.
                    return value;
                }
                if (allowed_groups.includes(value["group"])) {
                    return value;
                }
            } else {
                return value;
            }
            return null;
        });
        filtered_results = filter_empty(filtered_results);
        filtered_results = sortObjectsByKey(filtered_results, key_base);
        if (order_by === "desc" || order_by === "descending") {
            filtered_results = filtered_results.reverse();
        }
        return filtered_results;
    }

    @Memoize()
    async performQueryOnLive(args: LiveObjectParams, type: LiveStatus, dataSources: VTAPIDataSources): Promise<LiveObject[]> {
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
            let combinedyt_res: YoutubeDocument<YoutubeLiveData[]> = await dataSources.youtubeLive.getLive(allowed_users);
            try {
                delete combinedyt_res["_id"];
            } catch (e) {};
            let nijitube_res: YoutubeDocument<YoutubeLiveData[]>;
            if (anyNijiGroup(groups_choices)) {
                nijitube_res = await dataSources.nijitubeLive.getLive(allowed_users);
                try {
                    delete nijitube_res["_id"];
                } catch (e) {};
            }
            _.merge(combinedyt_res, nijitube_res);
            for (let [channel_id, channel_video] of Object.entries(combinedyt_res)) {
                if (channel_id === "_id") {
                    continue;
                }
                let mapped_yt = _.map(channel_video, (value) => {
                    // @ts-ignore
                    let remap: LiveObject = {}
                    remap["id"] = value["id"];
                    remap["room_id"] = null;
                    remap["title"] = value["title"];
                    remap["startTime"] = value["startTime"];
                    remap["endTime"] = value["endTime"];
                    // @ts-ignore
                    remap["status"] = value["status"];
                    remap["channel_id"] = channel_id;
                    remap["thumbnail"] = value["thumbnail"];
                    if (hasKey(value, "viewers")) {
                        remap["viewers"] = value["viewers"];
                        if (hasKey(value, "peakViewers")) {
                            remap["peakViewers"] = value["peakViewers"];
                        } else {
                            remap["peakViewers"] = null;
                        }
                    } else {
                        remap["viewers"] = null;
                        if (hasKey(value, "peakViewers")) {
                            remap["peakViewers"] = value["peakViewers"];
                        } else {
                            remap["peakViewers"] = null;
                        }
                    }
                    remap["group"] = value["group"];
                    remap["platform"] = "youtube";
                    return remap;
                });
                main_results = _.concat(main_results, mapped_yt);
            }
        }
        if (platforms_choices.includes("bilibili") && type !== "past") {
            let combined_map: BiliBiliLive[] = [];
            if (type === "upcoming") {
                let upcome_other: BiliBiliLive[] = await dataSources.otherbili.getUpcoming(allowed_users);
                combined_map = _.concat(combined_map, upcome_other);
                if (anyHoloProGroup(groups_choices)) {
                    let holobili: BiliBiliLive[] = await dataSources.holobili.getUpcoming(allowed_users);
                    combined_map = _.concat(combined_map, holobili);
                }
                if (anyNijiGroup(groups_choices)) {
                    let nijibili: BiliBiliLive[] = await dataSources.nijibili.getUpcoming(allowed_users);
                    combined_map = _.concat(combined_map, nijibili);
                }
            } else if (type === "live") {
                if (anyHoloProGroup(groups_choices)) {
                    let holobili: BiliBiliLive[] = await dataSources.holobili.getLive(allowed_users);
                    combined_map = _.concat(combined_map, holobili);
                }
                if (anyNijiGroup(groups_choices)) {
                    let nijibili: BiliBiliLive[] = await dataSources.nijibili.getLive(allowed_users);
                    combined_map = _.concat(combined_map, nijibili);
                }
            }
    
            let mapped_bili = _.map(combined_map, (value) => {
                // @ts-ignore
                let remap: LiveObject = {};
                remap["id"] = value["id"];
                remap["room_id"] = value["room_id"];
                remap["title"] = value["title"];
                remap["startTime"] = value["startTime"];
                remap["channel_id"] = value["channel"];
                if (hasKey(value, "thumbnail")) {
                    remap["thumbnail"] = value["thumbnail"];
                } else {
                    remap["thumbnail"] = null;
                }
                if (hasKey(value, "viewers")) {
                    remap["viewers"] = value["viewers"];
                    if (hasKey(value, "peakViewers")) {
                        remap["peakViewers"] = value["peakViewers"];
                    } else {
                        remap["peakViewers"] = null;
                    }
                } else {
                    remap["viewers"] = null;
                    if (hasKey(value, "peakViewers")) {
                        remap["peakViewers"] = value["peakViewers"];
                    } else {
                        remap["peakViewers"] = null;
                    }
                }
                remap["status"] = type;
                if (hasKey(value, "group")) {
                    remap["group"] = value["group"];
                }
                remap["platform"] = "bilibili";
                return remap;
            });
            main_results = _.concat(main_results, mapped_bili);
        }
        if (platforms_choices.includes("twitch") && type === "live") {
            let twitch_live: TwitchLiveData[] = await dataSources.twitchLive.getLive(allowed_users);
            let mapped_twitch = _.map(twitch_live, (value) => {
                // @ts-ignore
                let remap: LiveObject = {};
                remap["id"] = value["id"];
                remap["title"] = value["title"];
                remap["startTime"] = value["startTime"];
                remap["endTime"] = null;
                remap["channel_id"] = value["channel"];
                remap["thumbnail"] = value["thumbnail"];
                remap["viewers"] = value["viewers"];
                remap["peakViewers"] = value["peakViewers"];
                remap["status"] = "live";
                if (hasKey(value, "group")) {
                    remap["group"] = value["group"];
                } else {
                    remap["group"] = null;
                }
                remap["platform"] = "twitch";
                return remap;
            });
            main_results = _.concat(main_results, mapped_twitch);
        }
        if (platforms_choices.includes("twitcasting") && type === "live") {
            let twcast_live: TwitcastingLiveData[] = await dataSources.twitcastingLive.getLive(allowed_users);
            let mapped_twcast = _.map(twcast_live, (value) => {
                // @ts-ignore
                let remap: LiveObject = {};
                remap["id"] = value["id"];
                remap["title"] = value["title"];
                remap["startTime"] = value["startTime"];
                remap["channel_id"] = value["channel"];
                if (hasKey(value, "thumbnail")) {
                    remap["thumbnail"] = value["thumbnail"];
                } else {
                    remap["thumbnail"] = null;
                }
                remap["viewers"] = value["viewers"];
                remap["peakViewers"] = value["peakViewers"];
                remap["status"] = "live";
                if (hasKey(value, "group")) {
                    remap["group"] = value["group"];
                } else {
                    remap["group"] = null;
                }
                remap["platform"] = "twitcasting";
                return remap;
            });
            main_results = _.concat(main_results, mapped_twcast);
        }
        return main_results;
    }

    @Memoize()
    async performQueryOnChannel(args: ChannelObjectParams, dataSources: VTAPIDataSources, parents: ChannelParents): Promise<ChannelObject[]> {
        let user_ids_limit: string[] = getValueFromKey(parents, "channel_id", null) || getValueFromKey(args, "id", null);
        if (!Array.isArray(user_ids_limit)) {
            user_ids_limit = null;
        } else if (Array.isArray(user_ids_limit)) {
            if (typeof user_ids_limit[0] !== "string") {
                user_ids_limit = null;
            }
        }

        if (parents.force_single) {
            if (parents.platform === "youtube") {
                if (anyNijiGroup([parents.group])) {
                    var ytchan_info: YoutubeDocument<YoutubeChannelData> = await dataSources.nijitubeChannels.getChannel(user_ids_limit);
                } else {
                    var ytchan_info: YoutubeDocument<YoutubeChannelData> = await dataSources.youtubeChannels.getChannel(user_ids_limit);
                }
                let ytchan_mapped: ChannelObject[] = [];
                for (let [_, chan_info] of Object.entries(ytchan_info)) {
                    // @ts-ignore
                    let remap: ChannelObject = {};
                    remap["id"] = chan_info["id"];
                    remap["room_id"] = null;
                    remap["user_id"] = null;
                    remap["name"] = chan_info["name"];
                    remap["description"] = chan_info["description"];
                    remap["publishedAt"] = chan_info["publishedAt"];
                    remap["image"] = chan_info["thumbnail"];
                    remap["is_live"] = null;
                    remap["group"] = chan_info["group"];
                    remap["platform"] = "youtube";
                    ytchan_mapped.push(remap);
                }
                return ytchan_mapped;
            } else if (parents.platform === "bilibili") {
                var bili_channel: BiliBiliChannel[];
                if (anyNijiGroup([parents.group])) {
                    bili_channel = await dataSources.nijibili.getChannels(user_ids_limit);
                } else if (anyHoloProGroup([parents.group])) {
                    bili_channel = await dataSources.holobili.getChannels(user_ids_limit);
                } else {
                    bili_channel = await dataSources.otherbili.getChannels(user_ids_limit);
                }
                let bilichan_mapped: ChannelObject[] = _.map(bili_channel, (value) => {
                    // @ts-ignore
                    let remap: ChannelObject = {};
                    remap["id"] = value["id"];
                    remap["room_id"] = value["room_id"];
                    remap["user_id"] = null;
                    remap["name"] = value["name"];
                    remap["description"] = value["description"];
                    remap["publishedAt"] = null;
                    remap["image"] = value["thumbnail"];
                    remap["is_live"] = value["live"];
                    if (hasKey(value, "group")) {
                        remap["group"] = value["group"];
                    } else {
                        remap["group"] = null;
                    }
                    remap["platform"] = "bilibili"
                    return remap;
                });
                return bilichan_mapped;
            } else if (parents.platform === "twitcasting") {
                let twcast_stats: TwitcastingChannelDocument = await dataSources.twitcastingChannels.getChannels(user_ids_limit);
                let twcast_mapped: ChannelObject[] = [];
                for (let [_, chan_info] of Object.entries(twcast_stats)) {
                    // @ts-ignore
                    let remap: ChannelObject = {};
                    remap["id"] = chan_info["id"];
                    remap["room_id"] = null;
                    remap["user_id"] = null;
                    remap["name"] = chan_info["name"];
                    remap["description"] = chan_info["description"];
                    remap["publishedAt"] = null;
                    remap["image"] = chan_info["thumbnail"];
                    remap["group"] = chan_info["group"];
                    remap["is_live"] = null;
                    remap["platform"] = "twitcasting";
                    twcast_mapped.push(remap);
                }
                return twcast_mapped;
            } else if (parents.platform === "twitch") {
                let twch_stats: TwitchChannelDocument = await dataSources.twitchChannels.getChannels(user_ids_limit);
                let twch_mapped: ChannelObject[] = [];
                for (let [_, chan_info] of Object.entries(twch_stats)) {
                    // @ts-ignore
                    let remap: ChannelObject = {};
                    remap["id"] = chan_info["id"];
                    remap["room_id"] = null;
                    remap["user_id"] = chan_info["user_id"];
                    remap["name"] = chan_info["name"];
                    remap["description"] = chan_info["description"];
                    remap["publishedAt"] = chan_info["publishedAt"];
                    remap["image"] = chan_info["thumbnail"];
                    remap["group"] = chan_info["group"];
                    remap["is_live"] = null;
                    remap["platform"] = "twitch";
                    twch_mapped.push(remap);
                }
                return twch_mapped;
            }
        }

        let platforms_choices: string[] = getValueFromKey(args, "platforms", ["youtube", "bilibili", "twitch", "twitcasting"]);
        let groups_choices: string[] = getValueFromKey(args, "groups", null);

        let combined_channels: ChannelObject[] = [];
        if (platforms_choices.includes("youtube")) {
            let otherchan_collect: YoutubeDocument<YoutubeChannelData> = await dataSources.youtubeChannels.getChannel(user_ids_limit);
            if (anyNijiGroup(groups_choices)) {
                let nijichan_info: YoutubeDocument<YoutubeChannelData> = await dataSources.nijitubeChannels.getChannel(user_ids_limit);
                _.merge(otherchan_collect, nijichan_info);
            }
            let ytchan_mapped: ChannelObject[] = [];
            for (let [_, chan_info] of Object.entries(otherchan_collect)) {
                // @ts-ignore
                let remap: ChannelObject = {};
                remap["id"] = chan_info["id"];
                remap["room_id"] = null;
                remap["user_id"] = null;
                remap["name"] = chan_info["name"];
                remap["description"] = chan_info["description"];
                remap["publishedAt"] = chan_info["publishedAt"];
                remap["image"] = chan_info["thumbnail"];
                remap["is_live"] = null;
                remap["group"] = chan_info["group"];
                remap["platform"] = "youtube";
                ytchan_mapped.push(remap);
            }
            combined_channels = _.concat(combined_channels, ytchan_mapped);
        }
        if (platforms_choices.includes("bilibili")) {
            let otherbili_chans: BiliBiliChannel[] = await dataSources.otherbili.getChannels(user_ids_limit);
            if (anyNijiGroup(groups_choices)) {
                let nijibili_chans: BiliBiliChannel[] = await dataSources.nijibili.getChannels(user_ids_limit);
                _.merge(otherbili_chans, nijibili_chans);
            }
            if (anyHoloProGroup(groups_choices)) {
                let holobili_chans: BiliBiliChannel[] = await dataSources.holobili.getChannels(user_ids_limit);
                _.merge(otherbili_chans, holobili_chans);
            }
            let bilichan_mapped: ChannelObject[] = _.map(otherbili_chans, (value) => {
                // @ts-ignore
                let remap: ChannelObject = {};
                remap["id"] = value["id"];
                remap["room_id"] = value["room_id"];
                remap["user_id"] = null;
                remap["name"] = value["name"];
                remap["description"] = value["description"];
                remap["publishedAt"] = null;
                remap["image"] = value["thumbnail"];
                remap["is_live"] = value["live"];
                if (hasKey(value, "group")) {
                    remap["group"] = value["group"];
                } else {
                    remap["group"] = null;
                }
                remap["platform"] = "bilibili"
                return remap;
            });
            combined_channels = _.concat(combined_channels, bilichan_mapped);
        }
        if (platforms_choices.includes("twitcasting")) {
            let twcast_stats: TwitcastingChannelDocument = await dataSources.twitcastingChannels.getChannels(user_ids_limit);
            let twcast_mapped: ChannelObject[] = [];
            for (let [_, chan_info] of Object.entries(twcast_stats)) {
                // @ts-ignore
                let remap: ChannelObject = {};
                remap["id"] = chan_info["id"];
                remap["room_id"] = null;
                remap["user_id"] = null;
                remap["name"] = chan_info["name"];
                remap["description"] = chan_info["description"];
                remap["publishedAt"] = null;
                remap["image"] = chan_info["thumbnail"];
                remap["group"] = chan_info["group"];
                remap["is_live"] = null;
                remap["platform"] = "twitcasting";
                twcast_mapped.push(remap);
            }
            combined_channels = _.concat(combined_channels, twcast_mapped);
        } 
        if (platforms_choices.includes("twitch")) {
            let twch_stats: TwitchChannelDocument = await dataSources.twitchChannels.getChannels(user_ids_limit);
            let twch_mapped: ChannelObject[] = [];
            for (let [_, chan_info] of Object.entries(twch_stats)) {
                // @ts-ignore
                let remap: ChannelObject = {};
                remap["id"] = chan_info["id"];
                remap["room_id"] = null;
                remap["user_id"] = chan_info["user_id"];
                remap["name"] = chan_info["name"];
                remap["description"] = chan_info["description"];
                remap["publishedAt"] = chan_info["publishedAt"];
                remap["image"] = chan_info["thumbnail"];
                remap["group"] = chan_info["group"];
                remap["is_live"] = null;
                remap["platform"] = "twitch";
                twch_mapped.push(remap);
            }
            combined_channels = _.concat(combined_channels, twch_mapped);
        }
        return combined_channels;
    }

    @Memoize()
    async performQueryOnChannelStats(dataSources: VTAPIDataSources, parents: ChannelParents): Promise<ChannelStatistics> {
        if (parents.platform === "youtube") {
            if (parents.group) {
                if (anyNijiGroup([parents.group])) {
                    var yt_stats = await dataSources.nijitubeChannels.getChannelStats(parents.channel_id);
                } else {
                    var yt_stats = await dataSources.youtubeChannels.getChannelStats(parents.channel_id);
                }
            } else {
                var yt_stats = await dataSources.youtubeChannels.getChannelStats(parents.channel_id);
            }
            try {
                let yt_stats_channel: ChannelStatistics = yt_stats[parents.channel_id[0]];
                yt_stats_channel["level"] = null;
                return yt_stats_channel
            } catch (e) {
                console.error("[performQueryOnChannel] Failed to perform parents statistics on youtube ID: ", parents.channel_id[0]);
                return {
                    "subscriberCount": 0,
                    "viewCount": 0,
                    "videoCount": 0,
                    "level": null
                }
            };
        } else if (parents.platform === "bilibili") {
            var bili_stats: any[];
            if (parents.group) {
                if (anyNijiGroup([parents.group])) {
                    bili_stats = await dataSources.nijibili.getChannels(parents.channel_id);
                } else if (anyHoloProGroup([parents.group])) {
                    bili_stats = await dataSources.holobili.getChannels(parents.channel_id);
                } else {
                    bili_stats = await dataSources.otherbili.getChannels(parents.channel_id);
                }
            } else {
                let nijibili_stats = await dataSources.nijibili.getChannels(parents.channel_id);
                let holobili_stats = await dataSources.holobili.getChannels(parents.channel_id);
                let otherbili_stats = await dataSources.otherbili.getChannels(parents.channel_id);
                bili_stats = _.concat(nijibili_stats, holobili_stats, otherbili_stats);
            }
            for (let i = 0; i < bili_stats.length; i++) {
                let bili_elem_stats: BiliBiliChannel = bili_stats[i];
                if (bili_elem_stats["id"] === parents.channel_id[0]) {
                    return {
                        "subscriberCount": bili_elem_stats["subscriberCount"],
                        "viewCount": bili_elem_stats["viewCount"],
                        "videoCount": bili_elem_stats["videoCount"],
                        "level": null
                    }
                }
            }
            console.error("[performQueryOnChannel] Failed to perform parents statistics on bilibili ID: ", parents.channel_id[0]);
            return {
                "subscriberCount": 0,
                "viewCount": 0,
                "videoCount": 0,
                "level": null
            }
        } else if (parents.platform === "twitcasting") {
            let twcast_stats = await dataSources.twitcastingChannels.getChannels(parents.channel_id);
            try {
                let twcast_user_stats: TwitcastingChannelData = twcast_stats[parents.channel_id[0]];
                return {
                    "subscriberCount": twcast_user_stats["followerCount"],
                    "level": twcast_user_stats["level"],
                    "viewCount": null,
                    "videoCount": null
                }
            } catch (e) {
                console.error("[performQueryOnChannel] Failed to perform parents statistics on youtube ID: ", parents.channel_id[0]);
                return {
                    "subscriberCount": 0,
                    "level": 0,
                    "viewCount": null,
                    "videoCount": null
                }
            };
        } else if (parents.platform === "twitch") {
            let twch_stats = await dataSources.twitchChannels.getChannels(parents.channel_id);
            try {
                let twch_user_stats: TwitchChannelData = twch_stats[parents.channel_id[0]];
                return {
                    "subscriberCount": twch_user_stats["followerCount"],
                    "viewCount": twch_user_stats["viewCount"],
                    "videoCount": null,
                    "level": null
                }
            } catch (e) {
                console.error("[performQueryOnChannel] Failed to perform parents statistics on youtube ID: ", parents.channel_id[0]);
                return {
                    "subscriberCount": 0,
                    "viewCount": 0,
                    "videoCount": null,
                    "level": null,
                }
            };
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
            let cursor = getValueFromKey(args, "cursor", "");
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 50) {
                limit = 50;
            }
            console.log("[GraphQL-VTAPIv2] Processing live()");
            console.log("[GraphQL-VTAPIv2-live()] Arguments ->", args);
            console.log("[GraphQL-VTAPIv2-live()] Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req, "nocache", "0"));
            let cache_name = getCacheNameForLive(args, "live");
            // @ts-ignore
            let [results, ttl]: [LiveObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results) && !no_cache) {
                console.log(`[GraphQL-VTAPIv2-live()] Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                console.log("[GraphQL-VTAPIv2-live()] Missing cache, requesting manually...");
                console.log("[GraphQL-VTAPIv2-live()] Arguments ->", args);
                results = await VTQuery.performQueryOnLive(args, "live", ctx.dataSources);
                console.log(`[GraphQL-VTAPIv2-live()] Saving cache with name ${cache_name}, TTL 20s...`);
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 20, results);
                    ctx.res.set("Cache-Control", "private, max-age=20");
                }
                ctx.res.set("Cache-Control")
            }
            results = await VTQuery.sortQueryResults(
                results,
                getValueFromKey(args, "groups", null),
                getValueFromKey(args, "sort_by", "startTime"),
                getValueFromKey(args, "sort_order", "asc"),
                "live"
            )
            // @ts-ignore
            let final_results: LivesResource = {};
            let total_results = results.length;
            const b64 = new Base64();
            if (cursor !== "") {
                console.log("[GraphQL-VTAPIv2-live()] Using cursor to filter results...");
                let unbase64cursor = b64.decode(cursor);
                console.log(`[GraphQL-VTAPIv2-live()] Finding cursor index: ${unbase64cursor}`);
                let findIndex = _.findIndex(results, (o) => {return o.id === unbase64cursor});
                console.log(`[GraphQL-VTAPIv2-live()] Using cursor index: ${findIndex}`);
                let limitres = results.length;
                let max_limit = findIndex + limit;
                let hasnextpage = true;
                let next_cursor = null;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    console.log(`[GraphQL-VTAPIv2-live()] Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        console.log(`[GraphQL-VTAPIv2-live()] Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        console.log(`[GraphQL-VTAPIv2-live()] Next available cursor: None`);
                        hasnextpage = false;
                    }
                    
                }
                results = _.slice(results, findIndex, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: next_cursor,
                    hasNextPage: hasnextpage
                };
            } else {
                console.log(`[GraphQL-VTAPIv2-live()] Starting cursor from zero.`);
                let limitres = results.length;
                let hasnextpage = true;
                let next_cursor: string = null;
                let max_limit = limit;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    console.log(`[GraphQL-VTAPIv2-live()] Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        console.log(`[GraphQL-VTAPIv2-live()] Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        console.log(`[GraphQL-VTAPIv2-live()] Next available cursor: None`);
                        hasnextpage = false;
                    }
                }
                results = _.slice(results, 0, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: next_cursor,
                    hasNextPage: hasnextpage
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
            let cursor = getValueFromKey(args, "cursor", "");
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 50) {
                limit = 50;
            }
            console.log("[GraphQL-VTAPIv2] Processing upcoming()");
            console.log("[GraphQL-VTAPIv2-upcoming()] Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req, "nocache", "0"));
            let cache_name = getCacheNameForLive(args, "upcoming");
            // @ts-ignore
            let [results, ttl]: [LiveObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results) && !no_cache) {
                console.log(`[GraphQL-VTAPIv2-upcoming()] Cache hit! --> ${cache_name}`); 
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                console.log("[GraphQL-VTAPIv2-upcoming()] Missing cache, requesting manually...");
                console.log("[GraphQL-VTAPIv2-upcoming()] Arguments ->", args);
                results = await VTQuery.performQueryOnLive(args, "upcoming", ctx.dataSources);
                console.log(`[GraphQL-VTAPIv2-upcoming()] Saving cache with name ${cache_name}, TTL 20s...`);
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 20, results);
                    ctx.res.set("Cache-Control", "private, max-age=20");
                }
            }
            results = await VTQuery.sortQueryResults(
                results,
                getValueFromKey(args, "groups", null),
                getValueFromKey(args, "sort_by", "startTime"),
                getValueFromKey(args, "sort_order", "asc"),
                "upcoming"
            )
            // @ts-ignore
            let final_results: LivesResource = {};
            let total_results = results.length;
            const b64 = new Base64();
            if (cursor !== "") {
                console.log("[GraphQL-VTAPIv2-upcoming()] Using cursor to filter results...");
                let unbase64cursor = b64.decode(cursor);
                console.log(`[GraphQL-VTAPIv2-upcoming()] Finding cursor index: ${unbase64cursor}`);
                let findIndex = _.findIndex(results, (o) => {return o.id === unbase64cursor});
                console.log(`[GraphQL-VTAPIv2-upcoming()] Using cursor index: ${findIndex}`);
                let limitres = results.length;
                let max_limit = findIndex + limit;
                let hasnextpage = true;
                let next_cursor = null;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    console.log(`[GraphQL-VTAPIv2-live()] Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        console.log(`[GraphQL-VTAPIv2-upcoming()] Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        console.log(`[GraphQL-VTAPIv2-upcoming()] Next available cursor: None`);
                        hasnextpage = false;
                    }
                    
                }
                results = _.slice(results, findIndex, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: next_cursor,
                    hasNextPage: hasnextpage
                };
            } else {
                console.log(`[GraphQL-VTAPIv2-upcoming()] Starting cursor from zero.`);
                let limitres = results.length;
                let hasnextpage = true;
                let next_cursor: string = null;
                let max_limit = limit;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    console.log(`[GraphQL-VTAPIv2-upcoming()] Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        console.log(`[GraphQL-VTAPIv2-upcoming()] Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        console.log(`[GraphQL-VTAPIv2-upcoming()] Next available cursor: None`);
                        hasnextpage = false;
                    }
                }
                results = _.slice(results, 0, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: next_cursor,
                    hasNextPage: hasnextpage
                };
            }
            final_results["_total"] = total_results;
            return final_results;
        },
        ended: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<LivesResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 300, scope: 'PRIVATE'});
            let cursor = getValueFromKey(args, "cursor", "");
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 50) {
                limit = 50;
            }
            console.log("[GraphQL-VTAPIv2] Processing ended()");
            console.log("[GraphQL-VTAPIv2-ended()] Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req, "nocache", "0"));
            let cache_name = getCacheNameForLive(args, "past");
            // @ts-ignore
            let [results, ttl]: [LiveObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results) && !no_cache) {
                console.log(`[GraphQL-VTAPIv2-ended()] Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                console.log("[GraphQL-VTAPIv2-ended()] Missing cache, requesting manually...");
                console.log("[GraphQL-VTAPIv2-ended()] Arguments ->", args);
                results = await VTQuery.performQueryOnLive(args, "past", ctx.dataSources);
                console.log(`[GraphQL-VTAPIv2-ended()] Saving cache with name ${cache_name}, TTL 300s...`);
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 300, results);
                    ctx.res.set("Cache-Control", "private, max-age=300");
                }
            }
            results = await VTQuery.sortQueryResults(
                results,
                getValueFromKey(args, "groups", null),
                getValueFromKey(args, "sort_by", "startTime"),
                getValueFromKey(args, "sort_order", "asc"),
                "past"
            )
            // @ts-ignore
            let final_results: LivesResource = {};
            let total_results = results.length;
            const b64 = new Base64();
            if (cursor !== "") {
                console.log("[GraphQL-VTAPIv2-ended()] Using cursor to filter results...");
                let unbase64cursor = b64.decode(cursor);
                console.log(`[GraphQL-VTAPIv2-ended()] Finding cursor index: ${unbase64cursor}`);
                let findIndex = _.findIndex(results, (o) => {return o.id === unbase64cursor});
                console.log(`[GraphQL-VTAPIv2-ended()] Using cursor index: ${findIndex}`);
                let limitres = results.length;
                let max_limit = findIndex + limit;
                let hasnextpage = true;
                let next_cursor = null;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    console.log(`[GraphQL-VTAPIv2-ended()] Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        console.log(`[GraphQL-VTAPIv2-ended()] Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        console.log(`[GraphQL-VTAPIv2-ended()] Next available cursor: None`);
                        hasnextpage = false;
                    }
                    
                }
                results = _.slice(results, findIndex, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: next_cursor,
                    hasNextPage: hasnextpage
                };                
            } else {
                console.log(`[GraphQL-VTAPIv2-ended()] Starting cursor from zero.`);
                let limitres = results.length;
                let hasnextpage = true;
                let next_cursor: string = null;
                let max_limit = limit;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    console.log(`[GraphQL-VTAPIv2-ended()] Next available cursor: None`);
                } else {
                    try {
                        let next_data: LiveObject = _.nth(results, max_limit);
                        next_cursor = b64.encode(next_data["id"]);
                        console.log(`[GraphQL-VTAPIv2-ended()] Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        console.log(`[GraphQL-VTAPIv2-ended()] Next available cursor: None`);
                        hasnextpage = false;
                    }
                }
                results = _.slice(results, 0, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: next_cursor,
                    hasNextPage: hasnextpage
                };
            }
            final_results["_total"] = total_results;
            return final_results;
        },
        channels: async (_s, args: LiveObjectParams, ctx: VTAPIContext, info): Promise<ChannelsResource> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 1800, scope: 'PRIVATE'});
            let cursor = getValueFromKey(args, "cursor", "");
            let limit = getValueFromKey(args, "limit", 25);
            if (limit >= 50) {
                limit = 50;
            }
            console.log("[GraphQL-VTAPIv2] Processing channels()");
            console.log("[GraphQL-VTAPIv2-channels()] Arguments ->", args);
            console.log("[GraphQL-VTAPIv2-channels()] Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req, "nocache", "0"));
            let cache_name = getCacheNameForChannels(args, "channel");
            // @ts-ignore
            let [results, ttl]: [ChannelObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (!is_none(results) && !no_cache) {
                console.log(`[GraphQL-VTAPIv2-channels()] Cache hit! --> ${cache_name}`);
                ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            } else {
                console.log("[GraphQL-VTAPIv2-channels()] Missing cache, requesting manually...");
                console.log("[GraphQL-VTAPIv2-channels()] Arguments ->", args);
                results = await VTQuery.performQueryOnChannel(args, ctx.dataSources, {
                    "channel_id": args.channel_id,
                    "type": "channel",
                    "force_single": false
                });
                console.log(`[GraphQL-VTAPIv2-channels()] Saving cache with name ${cache_name}, TTL 1800s...`);
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                    ctx.res.set("Cache-Control", "private, max-age=1800");
                }
            }
            results = await VTQuery.sortQueryResults(
                results,
                getValueFromKey(args, "groups", null),
                getValueFromKey(args, "sort_by", "startTime"),
                getValueFromKey(args, "sort_order", "asc"),
                "channel"
            )
            // @ts-ignore
            let final_results: ChannelsResource = {};
            let total_results = results.length;
            const b64 = new Base64();
            if (cursor !== "") {
                console.log("[GraphQL-VTAPIv2-channels()] Using cursor to filter results...");
                let unbase64cursor = b64.decode(cursor);
                console.log(`[GraphQL-VTAPIv2-channels()] Finding cursor index: ${unbase64cursor}`);
                let findIndex = _.findIndex(results, (o) => {return o.id === unbase64cursor});
                console.log(`[GraphQL-VTAPIv2-channels()] Using cursor index: ${findIndex}`);
                let limitres = results.length;
                let max_limit = findIndex + limit;
                let hasnextpage = true;
                let next_cursor = null;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    console.log(`[GraphQL-VTAPIv2-channels()] Next available cursor: None`);
                } else {
                    try {
                        let next_data: ChannelObject = _.nth(results, max_limit);
                        // @ts-ignore
                        next_cursor = b64.encode(next_data["id"]);
                        console.log(`[GraphQL-VTAPIv2-channels()] Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        console.log(`[GraphQL-VTAPIv2-ended()] Next available cursor: None`);
                        hasnextpage = false;
                    }
                    
                }
                results = _.slice(results, findIndex, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: next_cursor,
                    hasNextPage: hasnextpage
                };
            } else {
                console.log(`[GraphQL-VTAPIv2-channels()] Starting cursor from zero.`);
                let limitres = results.length;
                let hasnextpage = true;
                let next_cursor: string = null;
                let max_limit = limit;
                if (max_limit > limitres) {
                    max_limit = limitres;
                    hasnextpage = false;
                    console.log(`[GraphQL-VTAPIv2-channels()] Next available cursor: None`);
                } else {
                    try {
                        let next_data: ChannelObject = _.nth(results, max_limit);
                        // @ts-ignore
                        next_cursor = b64.encode(next_data["id"]);
                        console.log(`[GraphQL-VTAPIv2-channels()] Next available cursor: ${next_cursor}`);
                    } catch (e) {
                        console.log(`[GraphQL-VTAPIv2-channels()] Next available cursor: None`);
                        hasnextpage = false;
                    }
                }
                results = _.slice(results, 0, max_limit);
                final_results["items"] = results;
                final_results["pageInfo"] = {
                    total_results: results.length,
                    results_per_page: limit,
                    nextCursor: next_cursor,
                    hasNextPage: hasnextpage
                };
            }
            final_results["_total"] = total_results;
            return final_results;
        }
    },
    ChannelObject: {
        statistics: async (parent: ChannelObject, _a, ctx: VTAPIContext, info): Promise<ChannelStatistics> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 3600, scope: 'PRIVATE'});
            // console.log("[GraphQL-VTAPIv2] Performing channels.statistics()", parent.platform, parent.id);
            let settings: ChannelParents = {
                platform: parent.platform,
                // @ts-ignore
                channel_id: [parent.id],
                group: null,
                type: "stats",
                force_single: true,
            }
            if (hasKey(parent, "group")) {
                settings["group"] = parent["group"];
            }
            // console.log("[GraphQL-VTAPIv2-channels()] Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req, "nocache", "0"));
            let cache_name = getCacheNameForChannels({}, "stats", parent);
            // @ts-ignore
            let [results, ttl]: [ChannelStatistics, number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (is_none(results)) {
                // console.log("[GraphQL-VTAPIv2-channels()] Missing cache, requesting manually...");
                // console.log("[GraphQL-VTAPIv2-channels()] Arguments ->", args);
                results = await VTQuery.performQueryOnChannelStats(ctx.dataSources, settings);
                // console.log(`[GraphQL-VTAPIv2-channels()] Saving cache with name ${cache_name}, TTL 1800s...`);
                if (!no_cache && !is_none(results)) {
                    // dont cache for reason.
                    ttl = 1800
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                }
            }
            if (is_none(results)) {
                console.error("[GraphQL-VTAPIv2] ERROR: Got non-null type returned for channels.statistics()", parent.platform, parent.id);
                return {
                    "subscriberCount": null,
                    "viewCount": null,
                    "videoCount": null,
                    "level": null
                }
            }
            ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            // console.log("ChannelDataStatsParent", parent);
            // console.log("ChannelDataStatsParam", args);
            return results;
        }
    },
    LiveObject: {
        channel: async (parent: LiveObject, args: ChannelObjectParams, ctx: VTAPIContext, info): Promise<ChannelObject> => {
            // @ts-ignore
            info.cacheControl.setCacheHint({maxAge: 1800, scope: 'PRIVATE'});
            // console.log("[GraphQL-VTAPIv2] Processing LiveObject.channel()", parent.platform, parent.channel_id);
            // console.log("[GraphQL-VTAPIv2-LiveObject.channel()] Checking for cache...");
            let no_cache = map_bool(getValueFromKey(ctx.req, "nocache", "0"));
            // @ts-ignore
            let cache_name = getCacheNameForChannels({}, "singlech", parent);
            // @ts-ignore
            let [results, ttl]: [ChannelObject[], number] = await ctx.cacheServers.getBetter(cache_name, true);
            if (is_none(results)) {
                // console.log("[GraphQL-VTAPIv2-LiveObject.channel()] Missing cache, requesting manually...");
                results = await VTQuery.performQueryOnChannel(args, ctx.dataSources, {
                    // @ts-ignore
                    "channel_id": [parent.channel_id],
                    "force_single": true,
                    "type": "channel",
                    "group": parent.group,
                    "platform": parent.platform
                });
                // console.log(`[GraphQL-VTAPIv2-LiveObject.channel()] Saving cache with name ${cache_name}, TTL 1800s...`);
                if (!no_cache && results.length > 0) {
                    // dont cache for reason.
                    ttl = 1800
                    await ctx.cacheServers.setexBetter(cache_name, 1800, results);
                }
            }
            if (results.length < 1) {
                console.error("[GraphQL-VTAPIv2-LiveObject.channel()] Failed to fetch", parent.platform, parent.channel_id, parent.group);
            }
            ctx.res.set("Cache-Control", `private, max-age=${ttl}`);
            return results[0];
        }
    },
    DateTime: DateTimeScalar
}