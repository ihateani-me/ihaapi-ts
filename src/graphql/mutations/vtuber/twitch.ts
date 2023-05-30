import _ from "lodash";
import { DateTime } from "luxon";

import { Channels, ChannelsModel, ChannelStats, ChannelStatsModel } from "../../../controller";
import { logger as MainLogger } from "../../../utils/logger";
import { is_none } from "../../../utils/swissknife";
import { TwitchHelix } from "./helper";

export async function ttvChannelDataset(
    channelId: string,
    group: string,
    en_name: string,
    ttvAPI?: TwitchHelix
): Promise<[boolean, string]> {
    const logger = MainLogger.child({ fn: "ttvChannelDataset" });
    if (is_none(ttvAPI)) {
        return [false, "Web Admin doesn't give Twitch API information"];
    }
    logger.info(`Searching for ${channelId} on group ${group} with name ${en_name}`);

    const channels = await ChannelsModel.findOne({
        id: { $eq: channelId },
        platform: { $eq: "twitch" },
    }).catch((_e) => {
        return {};
    });
    if (_.get(channels, "id")) {
        return [false, "Channel already exist on database"];
    }
    const channelIds = [{ id: channelId, group: group }];
    logger.info("fetching to API...");
    const twitch_results: any[] = await ttvAPI.fetchChannels([channelId]);
    if (twitch_results.length < 1) {
        logger.warn("can't find the channel.");
        return [false, "Cannot find that Twitch Channel"];
    }
    logger.info("parsing API results...");
    const newChannels: Channels[] = [];
    for (let i = 0; i < twitch_results.length; i++) {
        const result = twitch_results[i];
        logger.info(`parsing and fetching followers and videos ${result["login"]}`);
        const followersData = await ttvAPI.fetchChannelFollowers(result["id"]).catch((_e) => {
            logger.error(`failed to fetch follower list for: ${result["login"]}`);
            return { total: 0 };
        });
        const videosData = (
            await ttvAPI.fetchChannelVideos(result["id"]).catch((_e) => {
                logger.error(`failed to fetch video list for: ${result["login"]}`);
                return [{ viewable: "private" }];
            })
        ).filter((vid) => vid["viewable"] === "public");
        const channels_map = _.find(channelIds, { id: result["login"] });
        if (is_none(channels_map)) {
            continue;
        }
        const mappedUpdate: Channels = {
            id: result["login"],
            user_id: result["id"],
            name: result["display_name"],
            en_name: en_name,
            description: result["description"],
            thumbnail: result["profile_image_url"],
            publishedAt: result["created_at"],
            followerCount: followersData["total"],
            viewCount: result["view_count"],
            videoCount: videosData.length,
            group: group,
            platform: "twitch",
            is_retired: false,
        };
        newChannels.push(mappedUpdate);
    }

    const historyDatas: ChannelStats[] = newChannels.map((res) => {
        const timestamp = DateTime.utc().toSeconds();
        return {
            id: res["id"],
            history: [
                {
                    timestamp: timestamp,
                    followerCount: res["followerCount"],
                    viewCount: res["viewCount"],
                    videoCount: res["videoCount"],
                },
            ],
            group: res["group"],
            platform: "twitch",
        };
    });

    let commitFail = false;
    if (newChannels.length > 0) {
        logger.info(`committing new data...`);
        await ChannelsModel.insertMany(newChannels).catch((err) => {
            logger.error(`failed to insert new data, ${err.toString()}`);
            commitFail = true;
        });
        await ChannelStatsModel.insertMany(historyDatas).catch((err) => {
            logger.error(`Failed to insert new history data, ${err.toString()}`);
            commitFail = true;
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
        return [false, "Cannot find that Twitch Channel"];
    }
}
