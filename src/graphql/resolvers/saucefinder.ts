/* eslint-disable @typescript-eslint/no-unused-vars */
import "apollo-cache-control";
import express from "express";
import { IResolvers } from "apollo-server-express";
import { GraphQLJSON } from "graphql-type-json";

import { ASCII2DParams, IQDBParams, SauceNAOParams, SauceResource, SimilarityScalar } from "../schemas";
import { SauceRESTDataSources } from "../datasources";

import { CustomRedisCache } from "../caches/redis";
import { getValueFromKey, hasKey } from "../../utils/swissknife";
import { ASCII2D } from "../../utils/saucefinder";
import { logger as MainLogger } from "../../utils/logger";

interface SauceContext {
    req: express.Request;
    res: express.Response;
    cacheServers: CustomRedisCache;
    dataSources: SauceRESTDataSources;
}

export const SauceGQLResoler: IResolvers = {
    JSON: GraphQLJSON,
    Similarity: SimilarityScalar,
    Query: {
        saucenao: async (_s, args: SauceNAOParams, ctx: SauceContext, _i): Promise<SauceResource> => {
            const logger = MainLogger.child({ cls: "SauceGQL", fn: "SauceNAO" });
            try {
                const total_items = await ctx.dataSources.saucenao.getSauce(args.url, args);
                if (!Array.isArray(total_items) && hasKey(total_items, "error")) {
                    throw new Error(total_items["error"]);
                }
                // @ts-ignore
                return { _total: total_items.length, items: total_items };
            } catch (e) {
                logger.error(`Failed to reoslve SauceNAO data, reason: ${e.toString()}`);
                console.error(e);
                return { _total: 0, items: [] };
            }
        },
        iqdb: async (_s, args: IQDBParams, ctx: SauceContext, _i): Promise<SauceResource> => {
            const logger = MainLogger.child({ cls: "SauceGQL", fn: "IQDB" });
            try {
                const total_items = await ctx.dataSources.iqdb.getSauce(args.url, args);
                return { _total: total_items.length, items: total_items };
            } catch (e) {
                logger.error(`Failed to reoslve IQDB data, reason: ${e.toString()}`);
                console.error(e);
                return { _total: 0, items: [] };
            }
        },
        ascii2d: async (_s, args: ASCII2DParams, ctx: SauceContext, _i): Promise<SauceResource> => {
            const logger = MainLogger.child({ cls: "SauceGQL", fn: "ASCII2D" });
            try {
                const A2DAPI = new ASCII2D(getValueFromKey(args, "limit", 2) as number);
                const total_items = await A2DAPI.getSauce(args.url);
                return { _total: total_items.length, items: total_items };
            } catch (e) {
                logger.error(`Failed to reoslve ASCII2D data, reason: ${e.toString()}`);
                console.error(e);
                return { _total: 0, items: [] };
            }
        },
    },
};
