import {
    mildomChannelsDataset,
    ttvChannelDataset,
    twcastChannelsDataset,
    youtubeChannelDataset,
} from "./vtuber";

const VTuberMutation = {
    // @ts-ignore
    twitch: ttvChannelDataset,
    twitcasting: twcastChannelsDataset,
    mildom: mildomChannelsDataset,
    youtube: youtubeChannelDataset,
};

export { VTuberMutation };
