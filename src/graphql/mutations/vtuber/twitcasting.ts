import axios from "axios";
import _ from "lodash";
import moment from "moment-timezone";

import { ChannelsData, ChannelsProps, ChannelStatsHistData } from "../../../controller";
import { logger as MainLogger } from "../../../utils/logger";
import { is_none } from "../../../utils/swissknife";

const CHROME_UA =
    // eslint-disable-next-line max-len
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36";

export async function twcastChannelsDataset(channelId: string, group: string, en_name: string) {
    const session = axios.create({
        headers: {
            "User-Agent": CHROME_UA,
        },
    });
    const logger = MainLogger.child({ fn: "twcastChannelDataset" });

    logger.info("checking if channel exist...");
    const channels = await ChannelsData.findOne({
        id: { $eq: channelId },
        platform: { $eq: "twitcasting" },
    }).catch((_e: any) => {
        return {};
    });
    if (_.get(channels, "id")) {
        return [false, "Channel already exist on database"];
    }
    // @ts-ignore
    const channelIds = [{ id: channelId, group: group }];

    logger.info("creating fetch jobs...");
    const channelPromises = channelIds.map((channel) =>
        session
            .get(`https://frontendapi.twitcasting.tv/users/${channel.id}`, {
                params: {
                    detail: "true",
                },
                responseType: "json",
            })
            .then((jsonRes) => {
                return { data: jsonRes.data, group: channel.group };
            })
            .catch((err) => {
                logger.error(`failed fetching for ${channel.id}, error: ${err.toString()}`);
                return { data: {}, group: channel.group };
            })
    );
    logger.info("executing API requests...");
    const collectedChannels = (await Promise.all(channelPromises)).filter(
        (res) => Object.keys(res["data"]).length > 0
    );
    const insertData: ChannelsProps[] = [];
    for (let i = 0; i < collectedChannels.length; i++) {
        const raw_res = collectedChannels[i];
        const result = raw_res["data"];
        if (!_.has(result, "user")) {
            continue;
        }

        const udata = result["user"];
        let desc = "";
        if (_.has(udata, "description") && !is_none(udata["description"]) && udata["description"] !== "") {
            desc = udata["description"];
        }
        let profile_img: string = udata["image"];
        if (profile_img.startsWith("//")) {
            profile_img = "https:" + profile_img;
        }
        // @ts-ignore
        const mappedNew: ChannelsProps = {
            id: udata["id"],
            name: udata["name"],
            en_name: en_name,
            description: desc,
            thumbnail: profile_img,
            followerCount: udata["backerCount"],
            level: udata["level"],
            group: raw_res["group"],
            platform: "twitcasting",
        };
        insertData.push(mappedNew);
    }

    // @ts-ignore
    const historyDatas: ChannelStatsHistProps[] = insertData.map((res) => {
        const timestamp = moment.tz("UTC").unix();
        return {
            id: res["id"],
            history: [
                {
                    timestamp: timestamp,
                    followerCount: res["followerCount"],
                    level: res["level"],
                },
            ],
            group: res["group"],
            platform: "twitcasting",
        };
    });

    if (insertData.length > 0) {
        logger.info(`committing new data...`);
        let isCommitError = false;
        // @ts-ignore
        await ChannelsData.insertMany(insertData).catch((err) => {
            logger.error(`failed to insert new data, ${err.toString()}`);
            isCommitError = true;
        });
        await ChannelStatsHistData.insertMany(historyDatas).catch((err) => {
            logger.error(`Failed to insert new history data, ${err.toString()}`);
            isCommitError = true;
        });
        if (isCommitError) {
            return [
                false,
                "Failed to insert new VTuber to Twitcasting database, " +
                    "please try again later or contact the Web Admin",
            ];
        }
        return [true, "Success"];
    } else {
        return [false, "Cannot find the Twitcasting ID."];
    }
}
