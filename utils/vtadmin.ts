import axios from "axios";
import _ from "lodash";
import moment from "moment-timezone";
import { TwitcastingChannel, TwitchChannel, YoutubeChannel } from "../dbconn/models";
import { logger as MainLogger } from "./logger";
import { fallbackNaN, is_none } from "./swissknife";
import { TwitchHelix } from "./twitchapi";

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36";

export async function twcastChannelsDataset(channelId: string, group: string) {
    let session = axios.create({
        headers: {
            "User-Agent": CHROME_UA
        }
    })
    const logger = MainLogger.child({fn: "twcastChannelDataset"});

    logger.info("checking if channel exist...");
    let channels = await TwitcastingChannel.findOne({"id": {"$eq": channelId}}).catch((err) => {
        return {};
    });
    if (_.get(channels, "id")) {
        return [false, "Channel already exist on database"];
    }
    // @ts-ignore
    let channelIds = [{"id": channelId, "group": group}];

    logger.info("creating fetch jobs...");
    const channelPromises = channelIds.map((channel) => (
        session.get(`https://frontendapi.twitcasting.tv/users/${channel.id}`, {
            params: {
                detail: "true",
            },
            responseType: "json"
        })
        .then((jsonRes) => {
            return {"data": jsonRes.data, "group": channel.group};
        })
        .catch((err) => {
            logger.error(`failed fetching for ${channel.id}, error: ${err.toString()}`);
            return {"data": {}, "group": channel.group};
        })
    ));
    logger.info("executing API requests...");
    const collectedChannels = (await Promise.all(channelPromises)).filter(res => Object.keys(res["data"]).length > 0);
    let insertData = [];
    for (let i = 0; i < collectedChannels.length; i++) {
        let raw_res = collectedChannels[i];
        let result = raw_res["data"];
        if (!_.has(result, "user")) {
            continue;
        }

        let udata = result["user"];
        let desc = "";
        if (_.has(udata, "description") && !is_none(udata["description"]) && udata["description"] !== "") {
            desc = udata["description"]
        }
        let profile_img: string = udata["image"]
        if (profile_img.startsWith("//")) {
            profile_img = "https:" + profile_img
        }
        let mappedNew = {
            "id": udata["id"],
            "name": udata["name"],
            "description": desc,
            "thumbnail": profile_img,
            "followerCount": udata["backerCount"],
            "level": udata["level"],
            "group": raw_res["group"],
            "platform": "twitcasting"
        }
        insertData.push(mappedNew);
    }

    if (insertData.length > 0) {
        logger.info(`committing new data...`);
        var isCommitError = false;
        await TwitcastingChannel.insertMany(insertData).catch((err) => {
            logger.error(`failed to insert new data, ${err.toString()}`);
            isCommitError = true;
        });
        if (isCommitError) {
            return [false, "Failed to insert new VTuber to Twitcasting database, please try again later or contact the Web Admin"];
        }
        return [true, "Success"];
    } else {
        return [false, "Cannot find the Twitcasting ID."];
    }
}

interface AnyDict {
    [key: string]: any;
}

function getBestThumbnail(thumbnails: any, video_id: string): string {
    if (_.has(thumbnails, "maxres")) {
        return thumbnails["maxres"]["url"];
    } else if (_.has(thumbnails, "standard")) {
        return thumbnails["standard"]["url"];
    } else if (_.has(thumbnails, "high")) {
        return thumbnails["high"]["url"];
    } else if (_.has(thumbnails, "medium")) {
        return thumbnails["medium"]["url"];
    } else if (_.has(thumbnails, "default")) {
        return thumbnails["default"]["url"];
    }
    return `https://i.ytimg.com/vi/${video_id}/maxresdefault.jpg`;
}

function checkForYoutubeAPIError(apiReponses: any) {
    let errors = _.get(apiReponses, "error", undefined);
    if (typeof errors === "undefined") {
        return [false, false];
    }
    let errorsData: any[] = _.get(errors, "errors", []);
    if (errorsData.length < 1) {
        return [false, false];
    }
    let firstErrors = errorsData[0];
    let errorReason = _.get(firstErrors, "reason", "unknown");
    if (errorReason === "rateLimitExceeded") {
        return [true, true]
    }
    return [true, false];
}

export async function youtubeChannelDataset(channelId: string, group: string) {
    let session = axios.create({
        headers: {
            "User-Agent": `vtschedule-ts/0.3.0 (https://github.com/ihateani-me/vtscheduler-ts)`
        }
    })
    const logger = MainLogger.child({fn: "youtubeChannelDataset"});
    if (is_none(process.env.YOUTUBE_API_KEY)) {
        return [false, "Web Admin doesn't give a Youtube API Key to use in the environment table."];
    }

    let parsed_yt_channel = await YoutubeChannel.findOne({"id": {"$eq": channelId}}).catch((err) => {
        return {};
    });
    if (_.get(parsed_yt_channel, "id")) {
        return [false, "Channel already exist on database"];
    }
    
    // @ts-ignore
    let channelIds = [{"id": channelId, "group": group}];

    const chunked_channels_set = _.chunk(channelIds, 40);
    logger.info(`checking channels with total of ${channelIds.length} channels (${chunked_channels_set.length} chunks)...`);
    var apiExhausted = false;
    const items_data_promises = chunked_channels_set.map((chunks, idx) => (
        session.get("https://www.googleapis.com/youtube/v3/channels", {
            params: {
                part: "snippet,statistics",
                id: _.join(_.map(chunks, "id"), ","),
                maxResults: 50,
                key: process.env.YOUTUBE_API_KEY
            },
            responseType: "json"
        })
        .then((result) => {
            let yt_result = result.data;
            let items = yt_result["items"].map((res: any) => {
                // @ts-ignore
                let channel_data = _.find(channelIds, {"id": res.id});
                // @ts-ignore
                res["groupData"] = channel_data["group"];
                return res;
            })
            return items;
        }).catch((err) => {
            if (err.response) {
                let [isError, isAPIExhausted] = checkForYoutubeAPIError(err.response.data);
                if (isAPIExhausted) {
                    apiExhausted = true;
                }
            }
            logger.error(`failed to fetch info for chunk ${idx}, error: ${err.toString()}`);
            return [];
        })
    ))

    let items_data: any[] = await Promise.all(items_data_promises).catch((err) => {
        logger.error(`failed to fetch from API, error: ${err.toString()}`)
        return [];
    });
    if (apiExhausted) {
        logger.warn("API key exhausted, please change it");
        return [false, "API Keys already exhausted, please wait for 24 hours for it to be resetted."]
    }
    if (items_data.length < 1) {
        logger.warn("no response from API");
        return [false, "Cannot find the Youtube Channel"];
    }

    items_data = _.flattenDeep(items_data);
    logger.info(`preparing new data...`);
    const to_be_committed = items_data.map((res_item) => {
        let ch_id = res_item["id"];
        let snippets: AnyDict = res_item["snippet"];
        let statistics: AnyDict = res_item["statistics"];

        let title = snippets["title"];
        let desc = snippets["description"];
        let pubAt = snippets["publishedAt"]
        let group = res_item["groupData"];

        let thumbs = getBestThumbnail(snippets["thumbnails"], "");
        let subsCount = 0,
            viewCount = 0,
            videoCount = 0;

        let historyData: any[] = [];

        if (_.has(statistics, "subscriberCount")) {
            subsCount = fallbackNaN(parseInt, statistics["subscriberCount"], statistics["subscriberCount"]);
        }
        if (_.has(statistics, "viewCount")) {
            viewCount = fallbackNaN(parseInt, statistics["viewCount"], statistics["viewCount"]);
        }
        if (_.has(statistics, "videoCount")) {
            videoCount = fallbackNaN(parseInt, statistics["videoCount"], statistics["videoCount"]);
        }

        let currentTimestamp = moment.tz("UTC").unix();
        historyData.push({
            timestamp: currentTimestamp,
            subscriberCount: subsCount,
            viewCount: viewCount,
            videoCount: videoCount
        })

        // @ts-ignore
        let finalData: YTChannelProps = {
            id: ch_id,
            name: title,
            description: desc,
            publishedAt: pubAt,
            thumbnail: thumbs,
            subscriberCount: subsCount,
            viewCount: viewCount,
            videoCount: videoCount,
            group: group,
            history: historyData,
            platform: "youtube"
        }
        return finalData;
    })

    logger.info(`committing new data...`);
    var commitFail = false;
    await YoutubeChannel.insertMany(to_be_committed).catch((err) => {
        logger.error(`failed to insert new data, ${err.toString()}`);
        commitFail = true;
    });
    if (commitFail) {
        return [false, "Failed to insert new VTuber to Youtube database, please try again later or contact the Web Admin"];
    }
    return [true, "Success"];
}

export async function ttvChannelDataset(channelId: string, group: string, ttvAPI: TwitchHelix) {
    const logger = MainLogger.child({fn: "ttvChannelDataset"});

    let channels = await TwitchChannel.findOne({"id": {"$eq": channelId}}).catch((err) => {
        return {};
    });
    if (_.get(channels, "id")) {
        return [false, "Channel already exist on database"];
    }
    // @ts-ignore
    let channelIds = [{"id": channelId, "group": group}];
    logger.info("fetching to API...");
    let twitch_results: any[] = await ttvAPI.fetchChannels([channelId]);
    if (twitch_results.length < 1) {
        logger.warn("can't find the channel.")
        return [false, "Cannot find that Twitch Channel"];
    }
    logger.info("parsing API results...");
    let newChannels = [];
    for (let i = 0; i < twitch_results.length; i++) {
        let result = twitch_results[i];
        logger.info(`parsing and fetching followers and videos ${result["login"]}`);
        let followersData = await ttvAPI.fetchChannelFollowers(result["id"]).catch((err) => {
            logger.error(`failed to fetch follower list for: ${result["login"]}`);
            return {"total": 0};
        });
        let videosData = (await ttvAPI.fetchChannelVideos(result["id"]).catch((err) => {
            logger.error(`failed to fetch video list for: ${result["login"]}`);
            return [{"viewable": "private"}];
        })).filter(vid => vid["viewable"] === "public");
        // @ts-ignore
        let channels_map: VTuberModel = _.find(channelIds, {"id": result["login"]});
        let mappedUpdate = {
            "id": result["login"],
            "user_id": result["id"],
            "name": result["display_name"],
            "description": result["description"],
            "thumbnail": result["profile_image_url"],
            "publishedAt": result["created_at"],
            "followerCount": followersData["total"],
            "viewCount": result["view_count"],
            "videoCount": videosData.length,
            // @ts-ignore
            "group": channels_map["group"],
            "platform": "twitch",
        }
        newChannels.push(mappedUpdate);
    }

    var commitFail = false;
    if (newChannels.length > 0) {
        logger.info(`committing new data...`);
        await TwitchChannel.insertMany(newChannels).catch((err) => {
            logger.error(`failed to insert new data, ${err.toString()}`);
            commitFail = true;
        });
        if (commitFail) {
            return [false, "Failed to insert new VTuber to Twitch database, please try again later or contact the Web Admin"];
        }
        return [true, "Success"];
    } else {
        return [false, "Cannot find that Twitch Channel"];
    }
}

export async function vtapiRemoveVTuber(channelId: string, platform: string) {
    const logger = MainLogger.child({fn: `vtapiRemoveVTuber(${platform})`});
    if (platform === "youtube") {
        logger.info(`finding ${channelId} channel`)
        let channel = await YoutubeChannel.findOne({"id": {"$eq": channelId}}).catch((err) => {
            return {};
        });
        if (!_.get(channel, "id")) {
            return [false, "Channel doesn't exist on the database."];
        }
        let success = true;
        logger.info(`removing ${channelId} channel`)
        await YoutubeChannel.deleteMany({"id": {"$eq": channelId}}).catch((err) => {
            logger.error(`failed to remove channel ${channelId}, ${err.toString()}`);
            success = false;
        })
        if (success) {
            return [true, "Success"];
        }
        return [false, "Failed to remove channel from database, please try again later or contact the Web Admin"];
    } else if (platform === "twitch") {
        logger.info(`finding ${channelId} channel`)
        let channel = await TwitchChannel.findOne({"id": {"$eq": channelId}}).catch((err) => {
            return {};
        });
        if (!_.get(channel, "id")) {
            return [false, "Channel doesn't exist on the database."];
        }
        let success = true;
        logger.info(`removing ${channelId} channel`)
        await TwitchChannel.deleteMany({"id": {"$eq": channelId}}).catch((err) => {
            logger.error(`failed to remove channel ${channelId}, ${err.toString()}`);
            success = false;
        })
        if (success) {
            return [true, "Success"];
        }
        return [false, "Failed to remove channel from database, please try again later or contact the Web Admin"];
    } else if (platform === "twitcasting") {
        logger.info(`finding ${channelId} channel`)
        let channel = await TwitcastingChannel.findOne({"id": {"$eq": channelId}}).catch((err) => {
            return {};
        });
        if (!_.get(channel, "id")) {
            return [false, "Channel doesn't exist on the database."];
        }
        let success = true;
        logger.info(`removing ${channelId} channel`)
        await TwitcastingChannel.deleteMany({"id": {"$eq": channelId}}).catch((err) => {
            logger.error(`failed to remove channel ${channelId}, ${err.toString()}`);
            success = false;
        })
        if (success) {
            return [true, "Success"];
        }
        return [false, "Failed to remove channel from database, please try again later or contact the Web Admin"];
    }
    return [false, "Unknown platform"];
}