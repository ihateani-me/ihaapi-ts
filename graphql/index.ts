import {  ApolloServer, gql } from "apollo-server-express";
import { RedisCache } from "apollo-server-cache-redis";
import { vtbAPISchema } from "./schemes";

import Resolvers = require("./resolver");
import { is_none } from "../utils/swissknife";

const vtbapiDefs = gql(vtbAPISchema);

const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT);
if (is_none(REDIS_PASSWORD)) {
    var cacheServers = new RedisCache({
        host: is_none(REDIS_HOST) ? "127.0.0.1" : REDIS_HOST,
        port: isNaN(REDIS_PORT) ? 6379 : REDIS_PORT
    })
} else {
    var cacheServers = new RedisCache({
        host: is_none(REDIS_HOST) ? "127.0.0.1" : REDIS_HOST,
        port: isNaN(REDIS_PORT) ? 6379 : REDIS_PORT,
        password: REDIS_PASSWORD,
    })
}

const server = new ApolloServer({
    typeDefs: vtbapiDefs,
    resolvers: Resolvers.resolvers,
    cache: cacheServers,
    dataSources: () => ({
        youtubeLive: Resolvers.YoutubeLiveSources,
        youtubeChannels: Resolvers.YoutubeChannelsSources,
        nijitubeLive: Resolvers.NijitubeLiveSources,
        nijitubeChannels: Resolvers.NijitubeChannelsSources,
        twitchLive: Resolvers.TwitchLiveSources,
        twitchChannels: Resolvers.TwitchChannelsSources,
        twitcastingLive: Resolvers.TwitcastingLiveSources,
        twitcastingChannels: Resolvers.TwitcastingChannelsSources
    })
})

export default server;