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
