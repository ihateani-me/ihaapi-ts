import _ from "lodash";
import { DateTime } from "luxon";

import { MildomAPI } from "./helper";
import { logger as MainLogger } from "../../../utils/logger";
import { is_none } from "../../../utils/swissknife";
import { Channels, ChannelsModel, ChannelStats, ChannelStatsModel } from "../../../controller";

export async function mildomChannelsDataset(
    channelId: string,
    group: string,
    en_name: string,
    mildomAPI?: MildomAPI
): Promise<[boolean, string]> {
    if (is_none(mildomAPI)) {
        return [false, "Web Admin doesn't give Twitch API information"];
    }
    const logger = MainLogger.child({ fn: "mildomChannelsDataset" });
    const channels = await ChannelStatsModel.findOne({
        id: { $eq: channelId },
        platform: { $eq: "mildom" },
    }).catch((_e) => {
        return {};
    });
    if (_.get(channels, "id")) {
        return [false, "Channel already exist on database"];
    }
    logger.info("fetching to API...");
    const mildom_results = await mildomAPI.fetchUser(channelId);
    if (typeof mildom_results === "undefined") {
        logger.warn("can't find the channel.");
        return [false, "Cannot find that Mildom Channel"];
    }
    logger.info(`parsing API results...`);
    const insertData = [];
    const currentTimestamp = DateTime.utc().toSeconds();
    for (let i = 0; i < [mildom_results].length; i++) {
        const result = mildom_results;
        logger.info(`parsing and fetching followers and videos ${result["id"]}`);
        const videosData = await mildomAPI.fetchVideos(result["id"]);
        const historyData: any[] = [];
        historyData.push({
            timestamp: currentTimestamp,
            followerCount: result["followerCount"],
            level: result["level"],
            videoCount: videosData.length,
        });
        const mappedNew: Channels = {
            id: result["id"],
            name: result["name"],
            en_name: en_name,
            description: result["description"],
            thumbnail: result["thumbnail"],
            followerCount: result["followerCount"],
            videoCount: videosData.length,
            level: result["level"],
            group: group,
            platform: "mildom",
            is_retired: false,
        };
        insertData.push(mappedNew);
    }

    const historyDatas: ChannelStats[] = insertData.map((res) => {
        const timestamp = DateTime.utc().toSeconds();
        return {
            id: res["id"],
            history: [
                {
                    timestamp: timestamp,
                    followerCount: res["followerCount"],
                    level: res["level"],
                    videoCount: res["videoCount"],
                },
            ],
            group: res["group"],
            platform: "mildom",
        };
    });

    let commitFail = false;
    if (insertData.length > 0) {
        logger.info(`committing new data...`);
        await ChannelsModel.insertMany(insertData).catch((err) => {
            logger.error(`failed to insert new data, ${err.toString()}`);
            commitFail = true;
        });
        await ChannelStatsModel.insertMany(historyDatas).catch((err) => {
            logger.error(`Failed to insert new history data, ${err.toString()}`);
        });
        if (commitFail) {
            return [
                false,
                "Failed to insert new VTuber to Twitch database, " +
                    "please try again later or contact the Web Admin",
            ];
        }
        return [true, "Success"];
    } else {
        return [false, "Cannot find that Mildom Channel"];
    }
}
