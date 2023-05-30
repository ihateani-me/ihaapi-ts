import { IExecutableSchemaDefinition } from "@graphql-tools/schema";

import { BoardEngine, ImageBoardParams, ImageBoardResult, ImageBoardResults } from "../schemas";

import { DanbooruBoard, E621Board, GelbooruBoard, KonachanBoard } from "../../utils/imagebooru";
import { logger as TopLogger } from "../../utils/logger";
import _ from "lodash";
import { GQLContext } from "../types";

const MainLogger = TopLogger.child({ cls: "ImageBooruGQL" });

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

type IResolvers = Required<IExecutableSchemaDefinition<GQLContext>>["resolvers"];

export const ImageBooruGQLResolver: IResolvers = {
    Query: {
        async search(_p, args: ImageBoardParams, _c, _i): Promise<ImageBoardResults> {
            const logger = MainLogger.child({ fn: "search" });
            const engines = args.engine;

            const usingEngines = engines
                .filter((engine) => Object.keys(ImageBoardMapping).includes(engine.toLowerCase()))
                .map((e) => e.toLowerCase() as BoardEngine);
            const usingMappings = args.safeVersion ? ImageBoardMappingSafe : ImageBoardMapping;

            const requesterTasks = usingEngines.map((engine) => {
                usingMappings[engine]
                    .search(args.tags, args.page)
                    .then((res) => {
                        const remappedData = res.results.map((r) => {
                            // @ts-ignore
                            const mappedData: ImageBoardResult = {
                                ...r,
                                engine,
                            };
                            return mappedData;
                        });
                        return remappedData;
                    })
                    .catch((err: unknown) => {
                        if (err instanceof Error) {
                            logger.error(
                                `An error occured when fetching from engine ${engine}, ${err.toString()}`
                            );
                        }
                        return [];
                    });
            });

            const executedTasks = await Promise.all(requesterTasks);

            const finalizedData = _.flattenDeep(executedTasks);
            return {
                results: finalizedData as unknown as ImageBoardResult[],
                total: finalizedData.length,
            };
        },
        async random(_p, args: ImageBoardParams, _c, _i): Promise<ImageBoardResults> {
            const logger = MainLogger.child({ fn: "random" });
            const engines = args.engine;

            const usingEngines = engines
                .filter((engine) => Object.keys(ImageBoardMapping).includes(engine.toLowerCase()))
                .map((e) => e.toLowerCase() as BoardEngine);
            const usingMappings = args.safeVersion ? ImageBoardMappingSafe : ImageBoardMapping;

            const requesterTasks = usingEngines.map((engine) => {
                usingMappings[engine]
                    .random(args.tags, args.page)
                    .then((res) => {
                        const remappedData = res.results.map((r) => {
                            // @ts-ignore
                            const mappedData: ImageBoardResult = {
                                ...r,
                                engine,
                            };
                            return mappedData;
                        });
                        return remappedData;
                    })
                    .catch((err: unknown) => {
                        if (err instanceof Error) {
                            logger.error(
                                `An error occured when fetching from engine ${engine}, ${err.toString()}`
                            );
                        }
                        return [];
                    });
            });

            const executedTasks = await Promise.all(requesterTasks);

            const finalizedData = _.flattenDeep(executedTasks);
            return {
                results: finalizedData as unknown as ImageBoardResult[],
                total: finalizedData.length,
            };
        },
    },
};
