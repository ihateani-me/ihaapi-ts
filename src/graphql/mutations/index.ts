import { partialRight } from "lodash";

import config from "../../config";
import { is_none } from "../../utils/swissknife";
import { MildomAPI, TwitchHelix } from "./vtuber/helper";

import {
    mildomChannelsDataset,
    ttvChannelDataset,
    twcastChannelsDataset,
    youtubeChannelDataset,
} from "./vtuber";

const TTVConfig = config.vtapi.twitch;
let ttvAPIHandler: TwitchHelix;
if (!is_none(TTVConfig)) {
    if (!is_none(TTVConfig.client) && !is_none(TTVConfig.secret)) {
        ttvAPIHandler = new TwitchHelix(TTVConfig.client, TTVConfig.secret);
    }
}
const MILDOMHANDLER = new MildomAPI();

const VTuberMutation = {
    // @ts-ignore
    twitch: partialRight(ttvChannelDataset, ttvAPIHandler),
    twitcasting: twcastChannelsDataset,
    mildom: partialRight(mildomChannelsDataset, MILDOMHANDLER),
    youtube: youtubeChannelDataset,
};

export { VTuberMutation };
