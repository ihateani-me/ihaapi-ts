import { IExecutableSchemaDefinition } from "@graphql-tools/schema";

import { ASCII2DParams, IQDBParams, SauceNAOParams, SauceResource } from "../schemas";
import { SauceRESTDataSources } from "../datasources";

import { getValueFromKey, hasKey } from "../../utils/swissknife";
import { ASCII2D } from "../../utils/saucefinder";
import { logger as MainLogger } from "../../utils/logger";
import { GQLContext } from "../types";
import { GraphQLError } from "graphql";

export interface SauceContext extends GQLContext {
    dataSources: SauceRESTDataSources;
}

type IResolvers = Required<IExecutableSchemaDefinition<GQLContext>>["resolvers"];

export const SauceGQLResoler: IResolvers = {
    Query: {
        saucenao: async (_s, args: SauceNAOParams, ctx: SauceContext, _i): Promise<SauceResource> => {
            const logger = MainLogger.child({ cls: "SauceGQL", fn: "SauceNAO" });
            try {
                const total_items = await ctx.dataSources.saucenao.getSauce(args.url, args);
                if (!Array.isArray(total_items)) {
                    if (hasKey(total_items, "error")) {
                        throw new GraphQLError(total_items["error"], {
                            extensions: {
                                code: "SAUCENAO_ERROR",
                            },
                        });
                    }
                    throw new GraphQLError("Unknown error", {
                        extensions: {
                            code: "SAUCENAO_ERROR",
                        },
                    });
                }
                return { _total: total_items.length, items: total_items };
            } catch (e) {
                if (e instanceof Error) {
                    logger.error(`Failed to reoslve SauceNAO data, reason: ${e.toString()}`);
                } else {
                    logger.error(`Failed to reoslve SauceNAO data, reason: ${e}`);
                }
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
                if (e instanceof Error) {
                    logger.error(`Failed to reoslve IQDB data, reason: ${e.toString()}`);
                } else {
                    logger.error(`Failed to reoslve IQDB data, reason: ${e}`);
                }
                console.error(e);
                return { _total: 0, items: [] };
            }
        },
        ascii2d: async (_s, args: ASCII2DParams, _c: SauceContext, _i): Promise<SauceResource> => {
            const logger = MainLogger.child({ cls: "SauceGQL", fn: "ASCII2D" });
            try {
                const A2DAPI = new ASCII2D(getValueFromKey(args, "limit", 2) as number);
                const total_items = await A2DAPI.getSauce(args.url);
                return { _total: total_items.length, items: total_items };
            } catch (e) {
                if (e instanceof Error) {
                    logger.error(`Failed to reoslve ASCII2D data, reason: ${e.toString()}`);
                } else {
                    logger.error(`Failed to reoslve ASCII2D data, reason: ${e}`);
                }
                console.error(e);
                return { _total: 0, items: [] };
            }
        },
    },
};
