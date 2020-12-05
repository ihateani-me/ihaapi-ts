import { BiliBili } from "./bilibili";
import { TwitcastingChannel, TwitcastingLive } from "./twitcasting";
import { TwitchChannel, TwitchLive } from "./twitch";
import { YoutubeChannel, YoutubeLive } from "./youtube";

export * from "./youtube";
export * from "./bilibili";
export * from "./twitch";
export * from "./twitcasting";

export interface VTAPIDataSources {
    holobili: BiliBili
    nijibili: BiliBili
    otherbili: BiliBili
    youtubeLive: YoutubeLive
    youtubeChannels: YoutubeChannel
    nijitubeLive: YoutubeLive
    nijitubeChannels: YoutubeChannel
    twitchLive: TwitchLive
    twitchChannels: TwitchChannel
    twitcastingLive: TwitcastingLive
    twitcastingChannels: TwitcastingChannel
}