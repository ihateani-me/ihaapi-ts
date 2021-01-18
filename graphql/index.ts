import { ApolloServer } from "apollo-server-express";
import { ApolloServerPluginInlineTraceDisabled  } from "apollo-server-core";
import { CustomRedisCache } from "./caches/redis";

import { nHGQLSchemas, SauceAPIGQL, v2Definitions, VTAPIv2 } from "./schemas";
import { v2Resolvers } from "./resolvers";
import { is_none } from "../utils/swissknife";
import {
    YoutubeChannel as YTChannel,
    YoutubeVideo,
    BilibiliChannel as B2Channel,
    BilibiliVideo,
    TwitchChannel as TTVChannel,
    TwitchVideo,
    TwitcastingChannel as TWCastChannel,
    TwitcastingVideo,
    MildomChannel as NonoChannel,
    MildomVideo,
} from "../dbconn/models";
import { BiliBiliChannel, BiliBiliLive } from "./datasources/bilibili";
import { YoutubeChannel, YoutubeLive } from "./datasources/youtube";
import { TwitcastingLive, TwitcastingChannel } from "./datasources/twitcasting";
import { TwitchLive, TwitchChannel } from "./datasources/twitch";
import { MildomChannel, MildomLive } from "./datasources/mildom";
import { IQDBAPI, SauceNAOAPI } from "./datasources";

const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT);
if (is_none(REDIS_PASSWORD)) {
    var cacheServers = new CustomRedisCache({
        host: is_none(REDIS_HOST) ? "127.0.0.1" : REDIS_HOST,
        port: isNaN(REDIS_PORT) ? 6379 : REDIS_PORT
    })
} else {
    var cacheServers = new CustomRedisCache({
        host: is_none(REDIS_HOST) ? "127.0.0.1" : REDIS_HOST,
        port: isNaN(REDIS_PORT) ? 6379 : REDIS_PORT,
        password: REDIS_PASSWORD,
    })
}

export const GQLAPIv2Server = new ApolloServer({
    typeDefs: [VTAPIv2, SauceAPIGQL, nHGQLSchemas, v2Definitions],
    resolvers: v2Resolvers,
    cache: cacheServers,
    tracing: false,
    introspection: true,
    playground: false,
    context: ({ req, res }) => ({
        req, res, cacheServers
    }),
    dataSources: () => ({
        // @ts-ignore
        biliLive: new BiliBiliLive(BilibiliVideo),
        // @ts-ignore
        biliChannels: new BiliBiliChannel(B2Channel),
        // @ts-ignore
        youtubeLive: new YoutubeLive(YoutubeVideo),
        // @ts-ignore
        youtubeChannels: new YoutubeChannel(YTChannel),
        // @ts-ignore
        twitchLive: new TwitchLive(TwitchVideo),
        // @ts-ignore
        twitchChannels: new TwitchChannel(TTVChannel),
        // @ts-ignore
        twitcastingLive: new TwitcastingLive(TwitcastingVideo),
        // @ts-ignore
        twitcastingChannels: new TwitcastingChannel(TWCastChannel),
        // @ts-ignore
        mildomLive: new MildomLive(MildomVideo),
        // @ts-ignore
        mildomChannels: new MildomChannel(NonoChannel),
        saucenao: new SauceNAOAPI(),
        iqdb: new IQDBAPI(),
    }),
    plugins: [ApolloServerPluginInlineTraceDisabled()],
});
