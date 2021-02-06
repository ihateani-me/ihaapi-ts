import { ApolloServer } from "apollo-server-express";
import { ApolloServerPluginInlineTraceDisabled  } from "apollo-server-core";

import { CustomRedisCache } from "./caches/redis";
import { nHGQLSchemas, SauceAPIGQL, v2Definitions, VTAPIv2 } from "./schemas";
import { v2Resolvers } from "./resolvers";
import { is_none } from "../utils/swissknife";

import { IQDBAPI, SauceNAOAPI } from "./datasources";
import { VTAPIVideos, VTAPIChannels, VTAPIChannelStatsHist } from "./datasources/vtapi";

import {
    VideosData,
    ChannelStatsHistData,
    ChannelsData
} from "../dbconn/models"

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
        videos: new VTAPIVideos(VideosData),
        channels: new VTAPIChannels(ChannelsData),
        statsHist: new VTAPIChannelStatsHist(ChannelStatsHistData),
        saucenao: new SauceNAOAPI(),
        iqdb: new IQDBAPI(),
    }),
    plugins: [ApolloServerPluginInlineTraceDisabled()],
});
