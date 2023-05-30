import axios from "axios";
import _ from "lodash";
import { DateTime } from "luxon";

import { fallbackNaN, is_none } from "../../../utils/swissknife";
import { logger as MainLogger } from "../../../utils/logger";

import config from "../../../config";
import packageJson from "../../../../package.json";
import { Channels, ChannelsModel, ChannelStats, ChannelStatsModel } from "../../../controller";

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
    const errors = _.get(apiReponses, "error", undefined);
    if (typeof errors === "undefined") {
        return [false, false];
    }
    const errorsData: any[] = _.get(errors, "errors", []);
    if (errorsData.length < 1) {
        return [false, false];
    }
    const firstErrors = errorsData[0];
    const errorReason = _.get(firstErrors, "reason", "unknown");
    if (errorReason === "rateLimitExceeded") {
        return [true, true];
    }
    return [true, false];
}

export async function youtubeChannelDataset(
    channelId: string,
    group: string,
    en_name: string
): Promise<[boolean, string]> {
    const session = axios.create({
        headers: {
            "User-Agent": `ihaapi-ts/${packageJson["version"]} (https://github.com/ihateani-me/ihaapi-ts)`,
        },
    });
    const logger = MainLogger.child({ fn: "youtubeChannelDataset" });
    if (is_none(config.vtapi.youtube_key)) {
        return [false, "Web Admin doesn't have YouTube API Key provided on config."];
    }

    const parsed_yt_channel = await ChannelsModel.findOne({
        id: { $eq: channelId },
        platform: { $eq: "youtube" },
    }).catch((_e) => {
        return {};
    });
    if (_.get(parsed_yt_channel, "id")) {
        return [false, "Channel already exist on database"];
    }

    const channelIds = [{ id: channelId, group: group, name: en_name }];

    const chunked_channels_set = _.chunk(channelIds, 40);
    logger.info(
        // eslint-disable-next-line max-len
        `checking channels with total of ${channelIds.length} channels (${chunked_channels_set.length} chunks)...`
    );
    let apiExhausted = false;
    const items_data_promises = chunked_channels_set.map((chunks, idx) =>
        session
            .get("https://www.googleapis.com/youtube/v3/channels", {
                params: {
                    part: "snippet,statistics",
                    id: _.join(_.map(chunks, "id"), ","),
                    maxResults: 50,
                    key: config.vtapi.youtube_key,
                },
                responseType: "json",
            })
            .then((result) => {
                const yt_result = result.data;
                const items = yt_result["items"].map((res: any) => {
                    const channel_data = _.find(channelIds, { id: res.id });
                    res["groupData"] = channel_data?.group;
                    res["enName"] = channel_data?.name;
                    return res;
                });
                return items;
            })
            .catch((err) => {
                if (err.response) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [_e, isAPIExhausted] = checkForYoutubeAPIError(err.response.data);
                    if (isAPIExhausted) {
                        apiExhausted = true;
                    }
                }
                logger.error(`failed to fetch info for chunk ${idx}, error: ${err.toString()}`);
                return [];
            })
    );

    let items_data: any[] = await Promise.all(items_data_promises).catch((err) => {
        logger.error(`failed to fetch from API, error: ${err.toString()}`);
        return [];
    });
    if (apiExhausted) {
        logger.warn("API key exhausted, please change it");
        return [false, "API Keys already exhausted, please wait for 24 hours for it to be resetted."];
    }
    if (items_data.length < 1) {
        logger.warn("no response from API");
        return [false, "Cannot find the Youtube Channel"];
    }

    items_data = _.flattenDeep(items_data);
    logger.info(`preparing new data...`);
    const to_be_committed = items_data.map((res_item) => {
        const ch_id = res_item["id"];
        const snippets: AnyDict = res_item["snippet"];
        const statistics: AnyDict = res_item["statistics"];

        const title = snippets["title"];
        const desc = snippets["description"];
        const pubAt = snippets["publishedAt"];
        const enName = en_name;
        const customUrl = snippets["customUrl"] || null;

        const thumbs = getBestThumbnail(snippets["thumbnails"], "");
        let subsCount = 0,
            viewCount = 0,
            videoCount = 0;

        if (_.has(statistics, "subscriberCount")) {
            subsCount = fallbackNaN(parseInt, statistics["subscriberCount"], statistics["subscriberCount"]);
        }
        if (_.has(statistics, "viewCount")) {
            viewCount = fallbackNaN(parseInt, statistics["viewCount"], statistics["viewCount"]);
        }
        if (_.has(statistics, "videoCount")) {
            videoCount = fallbackNaN(parseInt, statistics["videoCount"], statistics["videoCount"]);
        }

        const finalData: Channels = {
            id: ch_id,
            yt_custom_id: customUrl,
            name: title,
            en_name: enName,
            description: desc,
            publishedAt: pubAt,
            thumbnail: thumbs,
            subscriberCount: subsCount,
            viewCount: viewCount,
            videoCount: videoCount,
            group: group,
            platform: "youtube",
            is_retired: false,
        };
        return finalData;
    });

    const historyDatas: ChannelStats[] = to_be_committed.map((res) => {
        const timestamp = DateTime.utc().toSeconds();
        return {
            id: res["id"],
            history: [
                {
                    timestamp: timestamp,
                    subscriberCount: res["subscriberCount"],
                    viewCount: res["viewCount"],
                    videoCount: res["videoCount"],
                },
            ],
            group: res["group"],
            platform: "youtube",
        };
    });

    logger.info(`committing new data...`);
    let commitFail = false;
    if (to_be_committed.length > 0) {
        logger.info(`committing new data...`);
        await ChannelsModel.insertMany(to_be_committed).catch((err) => {
            logger.error(`failed to insert new data, ${err.toString()}`);
            commitFail = true;
        });
    }
    if (historyDatas.length > 0) {
        logger.info(`youtubeChannelDataset(${group}) committing new history data...`);
        await ChannelStatsModel.insertMany(historyDatas).catch((err) => {
            logger.error(`failed to insert new history data, ${err.toString()}`);
            commitFail = true;
        });
    }
    if (commitFail) {
        return [
            false,
            "Failed to insert new VTuber to Youtube database, " +
                "please try again later or contact the Web Admin",
        ];
    }
    return [true, "Success"];
}
