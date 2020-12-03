import { NijiTubeDB, VTubersDB } from "../dbconn";

import BiliBili from "./datasources/bilibili";
import { YoutubeLive, YoutubeChannel } from "./datasources/youtube";
import { TwitcastingLive, TwitcastingChannel } from "./datasources/twitcasting";
import { TwitchChannel, TwitchLive } from "./datasources/twitch";
import { IResolvers } from "apollo-server-express";

// Export BiliBili Sources
export const HoloBiliSources = new BiliBili(VTubersDB.getCollection("hololive_data"));
export const NijiBiliSources = new BiliBili(VTubersDB.getCollection("nijisanji_data"));
export const OtherBiliSources = new BiliBili(VTubersDB.getCollection("otherbili_data"));

// Export Youtube Sources
export const YoutubeLiveSources = new YoutubeLive(VTubersDB.getCollection("yt_other_livedata"));
export const NijitubeLiveSources = new YoutubeLive(NijiTubeDB.getCollection("nijitube_live"));
export const YoutubeChannelsSources = new YoutubeChannel(VTubersDB.getCollection("yt_other_channels"));
export const NijitubeChannelsSources = new YoutubeChannel(NijiTubeDB.getCollection("nijitube_channels"));

// Export Twitcasting Sources
export const TwitcastingLiveSources = new TwitcastingLive(VTubersDB.getCollection("twitcasting_data"));
export const TwitcastingChannelsSources = new TwitcastingChannel(VTubersDB.getCollection("twitcasting_channels"));

// Export Twitch Sources
export const TwitchLiveSources = new TwitchLive(VTubersDB.getCollection("twitch_data"));
export const TwitchChannelsSources = new TwitchChannel(VTubersDB.getCollection("twitch_channels"));


// Create main resolvers
export const resolvers: IResolvers = {
    Query: {
        live(_, args, context, info) {

        },
        upcoming(_, args, ctx, info) {

        },
        ended(_, args, ctx, info) {

        },
        channels(_, args, ctx, info) {

        }
    },
    ChannelData: {
        statistics(parent, args, ctx, info) {

        }
    },
    LiveObject: {
        channel(parent, args, ctx, info) {

        }
    }
}