import { BiliBiliChannel, BiliBiliLive } from "./bilibili";
import { IQDBAPI, SauceNAOAPI } from "./saucerest";
import { TwitcastingChannel, TwitcastingLive } from "./twitcasting";
import { TwitchChannel, TwitchLive } from "./twitch";
import { YoutubeChannel, YoutubeLive } from "./youtube";
import { MildomLive, MildomChannel } from "./mildom";

export * from "./youtube";
export * from "./bilibili";
export * from "./twitch";
export * from "./twitcasting";
export * from "./saucerest";
export * from "./mildom";

export interface VTAPIDataSources {
    biliLive: BiliBiliLive
    biliChannels: BiliBiliChannel
    youtubeLive: YoutubeLive
    youtubeChannels: YoutubeChannel
    twitchLive: TwitchLive
    twitchChannels: TwitchChannel
    twitcastingLive: TwitcastingLive
    twitcastingChannels: TwitcastingChannel
    mildomLive: MildomLive
    mildomChannels: MildomChannel
}

export interface SauceRESTDataSources {
    saucenao: SauceNAOAPI
    iqdb: IQDBAPI
}
