import { logger } from "../utils/logger";

import { Server as HTTPServer } from "http";

import { WebSocketServer } from "ws";
import { Express } from "express";
import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import {
    ApolloServerPluginInlineTraceDisabled,
    ApolloServerPluginLandingPageDisabled,
    ApolloServerPluginSchemaReportingDisabled,
    ApolloServerPluginUsageReportingDisabled,
} from "@apollo/server/plugin/disabled";
import { Redis } from "ioredis";
import { KeyvAdapter } from "@apollo/utils.keyvadapter";
import { useServer } from "graphql-ws/lib/use/ws";
import Keyv from "keyv";
import KeyvRedis from "@keyv/redis";
import cors from "cors";
import { json } from "body-parser";

import typeDefsCollects from "./schemas";
import { v2Resolvers } from "./resolvers";
import { GQLContext } from "./types";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { SauceRESTDataSources, VTAPIDataSources } from "./datasources";
import { RedisDB } from "../controller";
import { SubscriptionResolver, v2SubscriptionSchemas } from "./subscription/";

export interface GQLServerStartupOptions {
    redis: Redis;
    httpServer: HTTPServer;
    wsServer?: WebSocketServer;
}

export function createGQLServer(options: GQLServerStartupOptions) {
    const log = logger.child({ module: "GQLv2" });
    const { httpServer, redis } = options;
    const tempDefs = [...typeDefsCollects];
    let finalResolvers = { ...v2Resolvers };
    if (v2SubscriptionSchemas.length > 0) {
        log.info("Binding GraphQL Subscription Schema");
        tempDefs.push(...v2SubscriptionSchemas);
        finalResolvers = { ...finalResolvers, ...SubscriptionResolver };
    }
    const typeDefs = tempDefs.join("\n\n");
    const keyvRedis = new KeyvRedis(redis);
    const keyv = new Keyv({ store: keyvRedis });
    const cacheAdapter = new KeyvAdapter(keyv);

    const schema = makeExecutableSchema({
        typeDefs,
        resolvers: finalResolvers,
    });

    const plugins: ApolloServerPlugin<GQLContext>[] = [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        ApolloServerPluginInlineTraceDisabled(),
        ApolloServerPluginSchemaReportingDisabled(),
        ApolloServerPluginUsageReportingDisabled(),
        ApolloServerPluginLandingPageDisabled(),
    ];

    if (options.wsServer) {
        log.info("Binding GraphQL Subscription WS Handler");
        const wsSrv = useServer(
            {
                schema,
                onConnect: async (ctx) => {
                    log.info(
                        `A new websocket connection has been established: ${JSON.stringify(
                            ctx,
                            undefined,
                            2
                        )}`
                    );
                },
                onDisconnect: async (ctx) => {
                    log.info(
                        `A websocket connection has been disconnected: ${JSON.stringify(ctx, undefined, 2)}`
                    );
                },
            },
            options.wsServer
        );
        plugins.push({
            async serverWillStart() {
                return {
                    async drainServer() {
                        await wsSrv.dispose();
                    },
                };
            },
        });
    }

    return new ApolloServer<GQLContext>({
        schema,
        introspection: true,
        cache: cacheAdapter,
        plugins,
    });
    1;
}

interface DataSources {
    vtapi: VTAPIDataSources;
    sauce: SauceRESTDataSources;
}

interface GQLBindingOptions {
    supportReplica: boolean;
    dataSources: DataSources;
    redisDB: RedisDB;
}

export async function bindGQLServer(app: Express, server: ApolloServer, options: GQLBindingOptions) {
    logger.info("Starting GraphQL Server");
    await server.start();
    logger.info("Binding GraphQL Server");
    app.use(
        "/v2/graphql",
        cors<cors.CorsRequest>(),
        json(),
        expressMiddleware(server, {
            context: async ({ req, res }) => {
                return {
                    req,
                    res,
                    redisCache: options.redisDB,
                    dataSources: options.dataSources,
                };
            },
        })
    );
}
