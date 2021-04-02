/* eslint-disable @typescript-eslint/no-unused-vars */
import "apollo-cache-control";
import express from "express";
import { IResolvers } from "apollo-server-express";
import { GraphQLJSON } from "graphql-type-json";

import { BoardEngine, ImageBoardParams, ImageBoardResult, ImageBoardResults } from "../schemas";
import { CustomRedisCache } from "../caches/redis";

import { DanbooruBoard, E621Board, GelbooruBoard, KonachanBoard } from "../../utils/imagebooru";
import { ImageBoardResultsBase } from "../../utils/imagebooru/base";
import { logger as TopLogger } from "../../utils/logger";
import _ from "lodash";

const MainLogger = TopLogger.child({ cls: "ImageBooruGQL" });
interface ImageBoardContext {
    req: express.Request;
    res: express.Response;
    cacheServers: CustomRedisCache;
}

const ImageBoardMapping = {
    danbooru: new DanbooruBoard(),
    konachan: new KonachanBoard(),
    gelbooru: new GelbooruBoard(),
    e621: new E621Board(),
};

const ImageBoardMappingSafe = {
    danbooru: new DanbooruBoard(true),
    konachan: new KonachanBoard(true),
    gelbooru: new GelbooruBoard(true),
    e621: new E621Board(true),
};

export const ImageBooruGQLResolver: IResolvers<any, ImageBoardContext> = {
    JSON: GraphQLJSON,
    Query: {
        search: async (_s, args: ImageBoardParams, ctx, _i): Promise<ImageBoardResults> => {
            const logger = MainLogger.child({ fn: "search" });
            let selectedEngine = args.engine;
            // Filter engine to make sure it will be not undefined
            selectedEngine = selectedEngine.filter((engine) =>
                Object.keys(ImageBoardMapping).includes(engine.toLowerCase())
            );
            selectedEngine = selectedEngine.map((e) => e.toLowerCase() as BoardEngine);
            const usingMappings = args.safeVersion ? ImageBoardMappingSafe : ImageBoardMapping;
            const requesterTasks = selectedEngine.map((engine) =>
                usingMappings[engine]
                    .search(args.tags, args.page)
                    // @ts-ignore
                    .then((res: ImageBoardResultsBase<ImageBoardResult>) => {
                        const remappedData = res.results.map((r) => {
                            r["engine"] = engine;
                            return r;
                        });
                        return remappedData;
                    })
                    .catch((err: Error) => {
                        logger.error(
                            `An error occured when fetching from engine ${engine}, ${err.toString()}`
                        );
                        return [];
                    })
            );
            const executedData = await Promise.all(requesterTasks);
            // @ts-ignore
            const finalizedData: ImageBoardResults[] = _.flattenDeep(executedData);
            return {
                results: finalizedData,
                total: executedData.length,
            };
        },
        random: async (_s, args: ImageBoardParams, ctx, _i): Promise<ImageBoardResults> => {
            const logger = MainLogger.child({ fn: "random" });
            let selectedEngine = args.engine;
            // Filter engine to make sure it will be not undefined
            selectedEngine = selectedEngine.filter((engine) =>
                Object.keys(ImageBoardMapping).includes(engine.toLowerCase())
            );
            selectedEngine = selectedEngine.map((e) => e.toLowerCase() as BoardEngine);
            const usingMappings = args.safeVersion ? ImageBoardMappingSafe : ImageBoardMapping;
            const requesterTasks = selectedEngine.map((engine) =>
                usingMappings[engine]
                    .random(args.tags, args.page)
                    // @ts-ignore
                    .then((res: ImageBoardResultsBase<ImageBoardResult>) => {
                        const remappedData = res.results.map((r) => {
                            r["engine"] = engine;
                            return r;
                        });
                        return remappedData;
                    })
                    .catch((err: Error) => {
                        logger.error(
                            `An error occured when fetching from engine ${engine}, ${err.toString()}`
                        );
                        console.error(err);
                        return [];
                    })
            );
            const executedData = await Promise.all(requesterTasks);
            // @ts-ignore
            const finalizedData: ImageBoardResults[] = _.flattenDeep(executedData);
            return {
                results: finalizedData,
                total: executedData.length,
            };
        },
    },
};
