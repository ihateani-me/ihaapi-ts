import { Channels, ChannelStats, Video } from "../../controller";
import { IQDBAPI, SauceNAOAPI } from "./saucerest";
import { VTAPIChannels, VTAPIChannelStatsHist, VTAPIVideos } from "./vtapi";

export * from "./saucerest";
export * from "./vtapi";

export interface VTAPIDataSources {
    videos: VTAPIVideos;
    channels: VTAPIChannels;
    statsHist: VTAPIChannelStatsHist;
}

export interface SauceRESTDataSources {
    saucenao: SauceNAOAPI;
    iqdb: IQDBAPI;
}

export default function initializeDataSources() {
    const vtapi = {
        videos: new VTAPIVideos(Video),
        channels: new VTAPIChannels(Channels),
        statsHist: new VTAPIChannelStatsHist(ChannelStats),
    };
    const sauce = {
        saucenao: new SauceNAOAPI(),
        iqdb: new IQDBAPI(),
    };

    return {
        vtapi,
        sauce,
    };
}
