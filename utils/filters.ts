// Filters function, this will filter data that fetched from database.

import { is_none, filter_empty, hasKey, sortObjectsByKey } from "./swissknife";
import { YouTubeData, BilibiliData, YTFilterArgs, YTLiveArray, LiveMap, ChannelArray, ChannelMap } from "./models";
import moment = require('moment-timezone');
import _ from "lodash";

export const GROUPS_MAPPINGS = {
    "holopro": ["hololive", "hololiveid", "hololivecn", "hololiveen", "hololivejp", "holostars"],
    "hololive": ["hololive", "hololiveid", "hololivecn", "hololiveen", "hololivejp"],
    "hololivejp": ["hololive", "hololivejp"],
    "hololiveid": ["hololiveid"],
    "hololivecn": ["hololivecn"],
    "hololiveen": ["hololiveen"],
    "holostars": ["holostars"],
    "nijisanji": ["nijisanji", "nijisanjijp", "nijisanjikr", "nijisanjiid", "nijisanjien", "nijisanjiin", "virtuareal"],
    "nijisanjikr": ["nijisanjikr"],
    "nijisanjijp": ["nijisanjijp", "nijisanji"],
    "nijisanjiin": ["nijisanjiin"],
    "nijisanjien": ["nijisanjien"],
    "nijisanjiid": ["nijisanjiid"],
    "nijisanjiworld": ["nijisanjikr", "nijisanjiid", "nijisanjien", "nijisanjiin"],
    "virtuareal": ["virtuareal"],
    "vtuberesports": ["irisbg", "cattleyarg", "lupinusvg"],
    "lupinusvg": ["lupinusvg"],
    "irisblackgames": ["irisbg"],
    "cattleyareginagames": ["cattleyarg"],
    "nanashi": ["vapart", "animare", "honeystrap", "sugarlyric"],
    "animare": ["animare"],
    "vapart": ["vapart"],
    "honeystrap": ["honeystrap"],
    "sugarlyric": ["sugarlyric"],
    "others": [
        "entum",
        "eilene",
        "solotuber",
        "solovtuber",
        "paryiproject",
        "vic",
        "dotlive",
        "vgaming",
        "vshojo",
        "upd8",
        "hanayori",
        "mahapanca"
    ],
    "mahapanca": ["mahapanca"],
    "eilene": ["eilene"],
    "vivid": ["vivid"],
    "noripro": ["noripro", "noriopro"],
    "noriopro": ["noripro", "noriopro"],
    "hanayori": ["hanayori"],
    "voms": ["voms"],
    "kizunaai": ["kizunaai"],
    "dotlive": ["dotlive"],
    "vic": ["vic"],
    "vgaming": ["vgaming"],
    "paryiproject": ["paryiproject"],
    "solo": ["solotuber", "solovtuber"],
    "solotuber": ["solotuber"],
    "solovtuber": ["solovtuber"],
    "entum": ["entum"],
    "vshojo": ["vshojo"]
}
export const GROUPS_KEY = [
    "vtuberesports",
    "nanashi",
    "others",
    "mahapanca",
    "vivid",
    "noripro",
    "voms",
    "hanayori",
    "kizunaai",
    "nijisanji",
    "holopro"
]


function get_group(group_name: string) {
    if (GROUPS_MAPPINGS.hasOwnProperty(group_name)) {
        return GROUPS_MAPPINGS[group_name];
    }
    return null;
}

function parse_youtube_live_args(args: YTFilterArgs, fetched_results: YouTubeData[]): LiveMap<YouTubeData[]> {
    let filtered_live: YouTubeData[] = [];
    let filtered_upcoming: YouTubeData[] = [];
    let filtered_ended: YouTubeData[] = [];
    const DEFAULT_FIELDS_KEY = [
        "id", "title", "status", "startTime", "thumbnail", "endTime", "viewers", "peakViewers", "channel", "channel_id", "group", "platform"
    ];

    var statuses = args.status;
    var groups = args.group;
    var fields = args.fields;
    let add_lives, add_upcoming, add_past;
    add_lives = add_upcoming = add_past = true
    if (is_none(statuses)) {
        statuses = "";
    };
    if (is_none(fields)) {
        fields = "";
    };
    var statuses_set = filter_empty(decodeURIComponent(statuses).split(","));
    var fields_set = filter_empty(decodeURIComponent(fields).split(","));
    var groups_set: string[] = filter_empty(decodeURIComponent(groups).split(","));
    
    if (groups_set.length == 0) {
        groups_set = Object.keys(GROUPS_MAPPINGS);
    };
    if (fields_set.length == 0) {
        fields_set = DEFAULT_FIELDS_KEY;
    };
    if (statuses_set.length > 0) {
        if (!statuses_set.includes("live")) { add_lives = false };
        if (!statuses_set.includes("upcoming")) { add_upcoming = false };
        if (!statuses_set.includes("ended")) { add_past = false };
    };

    console.log(`[parse_youtube_live_args] fields set: ${fields_set.join(", ")}`);
    console.log(`[parse_youtube_live_args] status live/upcoming/past: ${add_lives}/${add_upcoming}/${add_past}`);
    console.log("[parse_youtube_live_args] filtering data...");

    let allowed_groups = [];
    groups_set.forEach((group) => {
        let groups_map = get_group(group);
        if (groups_map) {
            allowed_groups = allowed_groups.concat(groups_map);
        }
    });
    allowed_groups = _.uniq(allowed_groups);

    if (Array.isArray(fetched_results)) {
        filtered_live = fetched_results.filter(res => res.status === "live");
        filtered_upcoming = fetched_results.filter(res => res.status === "upcoming");
        filtered_ended = fetched_results.filter(res => res.status === "past");
        console.log(filtered_live.length, filtered_upcoming.length, filtered_ended.length, fetched_results.length);
    } else if (typeof fetched_results == "object" && !Array.isArray(fetched_results)) {
        for (let [channel_id, channel_data] of Object.entries(fetched_results)) {
            // @ts-ignore
            channel_data.forEach((live_data) => {
                live_data["channel"] = channel_id;
                if (live_data["status"] === "live") {
                    filtered_live.push(live_data);
                } else if (live_data["status"] === "upcoming") {
                    filtered_upcoming.push(live_data);
                } else if (live_data["status"] === "past" || live_data["status"] === "ended") {
                    filtered_ended.push(live_data);
                }
            })
        }
        filtered_live = filtered_live.filter(res => (_.has(res, "group") && allowed_groups.includes(res.group)) && !_.has(res, "group"));
        filtered_upcoming = filtered_upcoming.filter(res => (_.has(res, "group") && allowed_groups.includes(res.group)) && !_.has(res, "group"));
        filtered_ended = filtered_ended.filter(res => (_.has(res, "group") && allowed_groups.includes(res.group)) && !_.has(res, "group"));
    } else {
        // @ts-ignore
        return fetched_results;
    }

    let key_to_delete = [];
    DEFAULT_FIELDS_KEY.forEach((field => {
        if (!fields_set.includes(field)) {
            key_to_delete.push(field);
        };
    }));
    filtered_live.forEach((live_data => {
        key_to_delete.forEach((kbye => {
            try {
                delete live_data[kbye];
            } catch (error) { };
        }));
    }));
    filtered_upcoming.forEach((live_data => {
        key_to_delete.forEach((kbye => {
            try {
                delete live_data[kbye];
            } catch (error) { };
        }));
    }));
    filtered_ended.forEach((live_data => {
        key_to_delete.forEach((kbye => {
            try {
                delete live_data[kbye];
            } catch (error) { };
        }));
    }));

    if (!key_to_delete.includes("startTime")) {
        // @ts-ignore
        filtered_live = sortObjectsByKey(filtered_live, "startTime");
        // @ts-ignore
        filtered_upcoming = sortObjectsByKey(filtered_upcoming, "startTime");
    }
    if (!key_to_delete.includes("endTime")) {
        // @ts-ignore
        filtered_ended = sortObjectsByKey(filtered_ended, "endTime");
    }
    let finalized_livemap: LiveMap<YouTubeData[]> = {}
    if (add_lives) { finalized_livemap["live"] = filtered_live; }
    if (add_upcoming) { finalized_livemap["upcoming"] = filtered_upcoming; }
    if (add_past) { finalized_livemap["ended"] = filtered_ended; }
    return finalized_livemap;
}

function bilibili_use_uuids(uuids: any, fetched_results: BilibiliData[]): BilibiliData[] {
    if (uuids == undefined || uuids == null) {
        return fetched_results;
    }
    var uuids_splitted = decodeURIComponent(uuids).split(",");
    console.debug(`[bilibili_use_uuids] filtering with user UUIDs: ${uuids_splitted.join(", ")}`);
    let filtered_results: BilibiliData[] = [];
    fetched_results.forEach((stream) => {
        if (uuids_splitted.includes(stream.channel)) {
            filtered_results.push(stream);
        };
    });
    return filtered_results;
}

function channel_filters(args: YTFilterArgs, fetched_results: ChannelArray<any>): ChannelMap<any[]> {
    let channels_data: any[] = [];
    const DEFAULT_FIELDS_KEY = [
        "id",
        "name",
        "description",
        "thumbnail",
        "platform",
        "room_id",
        "subscriberCount",
        "viewCount",
        "videoCount",
        "live",
        "publishedAt",
        "group",
        "user_id",
        "followerCount",
        "level"
    ];

    var groups = args.group;
    var fields = args.fields;
    var sort_by = args.sort;
    var sort_order = args.order;
    if (is_none(groups)) {
        groups = "";
    };
    if (is_none(fields)) {
        fields = "";
    };
    if (is_none(sort_by)) {
        sort_by = "name";
    } else {
        if (!DEFAULT_FIELDS_KEY.includes(sort_by)) {
            sort_by = "name";
        } else if (sort_by == "live") {
            sort_by = "name";
        }
    }
    if (is_none(sort_order)) {
        sort_order = "ascending";
    }
    sort_order = sort_order.toLowerCase();
    var groups_set: string[] = filter_empty(decodeURIComponent(groups).split(","));
    var fields_set = filter_empty(decodeURIComponent(fields).split(","));

    if (groups_set.length == 0) {
        groups_set = Object.keys(GROUPS_MAPPINGS);
    };
    if (fields_set.length == 0) {
        fields_set = DEFAULT_FIELDS_KEY;
    };

    console.log(`[channel_filters] groups set: ${groups_set.join(", ")}`);
    console.log(`[channel_filters] fields set: ${fields_set.join(", ")}`);
    console.log(`[channel_filters] sorted by/sort order: ${sort_by}/${sort_order}`);

    let allowed_groups = [];
    groups_set.forEach((group) => {
        let groups_map = get_group(group);
        if (groups_map) {
            allowed_groups = allowed_groups.concat(groups_map);
        }
    });
    allowed_groups = _.uniq(allowed_groups);

    if (Array.isArray(fetched_results)) {
        channels_data = fetched_results.filter(res => (_.has(res, "group") && allowed_groups.includes(res["group"])) || !_.has(res, "group"));
    } else if (typeof fetched_results == "object" && !Array.isArray(fetched_results)) {
        for (let [_, channel_data] of Object.entries(fetched_results)) {
            if (hasKey(channel_data, "publishedAt")) {
                channel_data["publishedAt"] = moment.utc(channel_data["publishedAt"]).unix();
            }
            if (hasKey(channel_data, "group")) {
                if (allowed_groups.includes(channel_data["group"])) {
                    channels_data.push(channel_data);
                }
            } else {
                channels_data.push(channel_data);
            }
        }
    } else {
        // @ts-ignore
        return fetched_results;
    }

    let key_to_delete = [];
    DEFAULT_FIELDS_KEY.forEach((field => {
        if (!fields_set.includes(field)) {
            key_to_delete.push(field);
        };
    }));
    channels_data.forEach((live_data => {
        key_to_delete.forEach((kbye => {
            try {
                delete live_data[kbye];
            } catch (error) { };
        }));
    }));

    if (hasKey(channels_data[0], sort_by)) {
        channels_data = sortObjectsByKey(channels_data, sort_by);
    };
    if (sort_order == "descending") { channels_data = channels_data.reverse(); };

    let finalized_map: ChannelMap<any[]> = {};
    finalized_map["channels"] = channels_data;
    finalized_map["cached"] = true;
    return finalized_map;
}

// Export main function,
export { bilibili_use_uuids, parse_youtube_live_args, channel_filters, get_group };