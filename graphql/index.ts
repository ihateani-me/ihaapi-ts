import { ApolloServer, ApolloServerExpressConfig } from "apollo-server-express";
import { ApolloServerPluginUsageReportingDisabled } from "apollo-server-core";
import { CustomRedisCache } from "./caches/redis";

import { SauceAPIGQL, VTAPIv2 } from "./schemas";
import { SauceGQLResoler, VTAPIv2Resolvers } from "./resolvers";
import { is_none } from "../utils/swissknife";
import { NijiTubeDB, VTubersDB } from "../dbconn";
import { BiliBili } from "./datasources/bilibili";
import { YoutubeChannel, YoutubeLive } from "./datasources/youtube";
import { TwitcastingLive, TwitcastingChannel } from "./datasources/twitcasting";
import { TwitchLive, TwitchChannel } from "./datasources/twitch";
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

const vtuberapi_settings: ApolloServerExpressConfig = {
    typeDefs: VTAPIv2,
    resolvers: VTAPIv2Resolvers,
    cache: cacheServers,
    tracing: true,
    introspection: true,
    context: ({ req, res }) => ({
        // passthrough req and res
        req, res, cacheServers
    }),
    dataSources: () => ({
        holobili: new BiliBili(VTubersDB.db.collection("hololive_data")),
        nijibili: new BiliBili(VTubersDB.db.collection("nijisanji_data")),
        otherbili: new BiliBili(VTubersDB.db.collection("otherbili_data")),
        youtubeLive: new YoutubeLive(VTubersDB.db.collection("yt_other_livedata")),
        youtubeChannels: new YoutubeChannel(VTubersDB.db.collection("yt_other_channels")),
        nijitubeLive: new YoutubeLive(NijiTubeDB.db.collection("nijitube_live")),
        nijitubeChannels: new YoutubeChannel(NijiTubeDB.db.collection("nijitube_channels")),
        twitchLive: new TwitchLive(VTubersDB.db.collection("twitch_data")),
        twitchChannels: new TwitchChannel(VTubersDB.db.collection("twitch_channels")),
        twitcastingLive: new TwitcastingLive(VTubersDB.db.collection("twitcasting_data")),
        twitcastingChannels: new TwitcastingChannel(VTubersDB.db.collection("twitcasting_channels")),
    })
}

const sauceapi_settings: ApolloServerExpressConfig = {
    typeDefs: SauceAPIGQL,
    resolvers: SauceGQLResoler,
    cache: cacheServers,
    tracing: true,
    introspection: true,
    context: ({ req, res }) => ({
        req, res, cacheServers
    }),
    dataSources: () => ({
        saucenao: new SauceNAOAPI(),
        iqdb: new IQDBAPI(),
    })
}

if (!is_none(process.env.VTUBERAPI_APOLLO_KEY) && !is_none(process.env.VTUBERAPI_APOLLO_GRAPH_VARIANT)) {
    vtuberapi_settings["apollo"] = {
        key: process.env.VTUBERAPI_APOLLO_KEY,
        graphVariant: process.env.VTUBERAPI_APOLLO_GRAPH_VARIANT,
    }
} else {
    vtuberapi_settings["plugins"] = [ApolloServerPluginUsageReportingDisabled()];
}

if (!is_none(process.env.SAUCEAPI_APOLLO_KEY) && !is_none(process.env.SAUCEAPI_APOLLO_GRAPH_VARIANT)) {
    sauceapi_settings["apollo"] = {
        key: process.env.SAUCEAPI_APOLLO_KEY,
        graphVariant: process.env.SAUCEAPI_APOLLO_GRAPH_VARIANT,
    }
} else {
    sauceapi_settings["plugins"] = [ApolloServerPluginUsageReportingDisabled()];
}

const server_vtuberapi = new ApolloServer(vtuberapi_settings)
const server_saucefinder = new ApolloServer(sauceapi_settings)

export {
    server_vtuberapi,
    server_saucefinder
}