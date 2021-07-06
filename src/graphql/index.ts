import _ from "lodash";
import { ApolloServer } from "apollo-server-express";
import { ApolloServerPluginInlineTraceDisabled } from "apollo-server-core";

import { CustomRedisCache } from "./caches/redis";
import { ImageBooruSchemas, nHGQLSchemas, SauceAPIGQL, v2Definitions, VTAPIv2 } from "./schemas";
import { v2Resolvers } from "./resolvers";
import { SubscriptionResolver, v2SubscriptionSchemas } from "./subscription";
import { IQDBAPI, SauceNAOAPI } from "./datasources";
import { VTAPIChannels, VTAPIChannelStatsHist, VTAPIVideos } from "./datasources/vtapi";

import { is_none } from "../utils/swissknife";
import { ChannelsData, ChannelStatsHistData, VideosData } from "../controller/models";
import { logger } from "../utils/logger";

import config from "../config";

const REDIS_PASSWORD = config["redis"]["password"];
const REDIS_HOST = config["redis"]["host"];
const REDIS_PORT = config["redis"]["port"];
const cacheServers = new CustomRedisCache({
    host: is_none(REDIS_HOST) ? "127.0.0.1" : REDIS_HOST,
    port: isNaN(REDIS_PORT) ? 6379 : REDIS_PORT,
    password: is_none(REDIS_PASSWORD) ? undefined : REDIS_PASSWORD,
});

let typeDefs = [VTAPIv2, SauceAPIGQL, nHGQLSchemas, ImageBooruSchemas, v2Definitions];
const v2ResolversFinal = v2Resolvers;
if (!is_none(config.mongodb.replica_set) && config.mongodb.replica_set.length > 0) {
    logger.info("Enabling replica subscription (schemas)...");
    typeDefs = _.concat(typeDefs, v2SubscriptionSchemas);
}
if (Object.keys(SubscriptionResolver["Subscription"]).length > 0) {
    logger.info("Enabling replica subscription (resolver)...");
    _.merge(v2ResolversFinal, SubscriptionResolver);
}

export const GQLAPIv2Server = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: v2ResolversFinal,
    cache: cacheServers,
    tracing: false,
    introspection: true,
    playground: false,
    context: ({ req, res }) => ({
        req,
        res,
        cacheServers,
    }),
    subscriptions: {
        path: "/v2/graphqlws",
        onConnect: (connParams, webSocket, context) => {
            logger.info(`A new connection established, ${webSocket.url}`);
        },
        onDisconnect: (webSocket, context) => {
            logger.info(`A connection has been severed, ${webSocket.url}`);
        },
    },
    dataSources: () => ({
        videos: new VTAPIVideos(VideosData),
        channels: new VTAPIChannels(ChannelsData),
        statsHist: new VTAPIChannelStatsHist(ChannelStatsHistData),
        saucenao: new SauceNAOAPI(),
        iqdb: new IQDBAPI(),
    }),
    plugins: [ApolloServerPluginInlineTraceDisabled()],
});
