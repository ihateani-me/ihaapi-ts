/* eslint-disable @typescript-eslint/no-unused-vars */
import "apollo-cache-control";
import express from "express";
import { IResolvers } from "apollo-server-express";
import { GraphQLJSON } from "graphql-type-json";

import { BoardEngine, ImageBoardParams, ImageBoardResult, ImageBoardResults } from "../schemas";
import { CustomRedisCache } from "../caches/redis";

import { DanbooruBoard, GelbooruBoard, KonachanBoard } from "../../utils/imagebooru";
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
    safebooru: new DanbooruBoard(true),
    konachan: new KonachanBoard(),
    gelbooru: new GelbooruBoard(),
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
            const requesterTasks = selectedEngine.map((engine) =>
                ImageBoardMapping[engine]
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
            let executedData = await Promise.all(requesterTasks);
            executedData = _.flattenDeep(executedData);
            return {
                results: executedData,
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
            const requesterTasks = selectedEngine.map((engine) =>
                ImageBoardMapping[engine]
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
                        return [];
                    })
            );
            let executedData = await Promise.all(requesterTasks);
            executedData = _.flattenDeep(executedData);
            return {
                results: executedData,
                total: executedData.length,
            };
        },
    },
};
