import _ from "lodash";
import { FilterQuery } from "mongoose";
import { createSchema, ExtractDoc, ExtractProps, Type, typedModel } from "ts-mongoose";

import { PlatformData } from "./extras";
import {
    FindPaginatedResult,
    findPaginationMongoose,
    IPaginateOptions,
    IPaginateResults,
    remapSchemaToDatabase,
} from "./pagination";
import { fallbackNaN } from "../../utils/swissknife";

const ChannelsSchema = createSchema({
    id: Type.string({ required: true }),
    room_id: Type.string(), // Bilibili Specific
    user_id: Type.string(), // Twitch Specific
    name: Type.string({ required: true }),
    en_name: Type.string(),
    description: Type.string(),
    publishedAt: Type.string(), // YT/TTV/B2 Specific
    subscriberCount: Type.number(),
    viewCount: Type.number(),
    videoCount: Type.number(),
    followerCount: Type.number(), // TWCast/Mildom specific
    level: Type.number(), // Mildom/TWCast specific
    thumbnail: Type.string({ required: true }),
    group: Type.string({ required: true }),
    platform: Type.string({ required: true, enum: PlatformData }),
    is_live: Type.boolean(), // B2 Specific
    is_retired: Type.boolean(),
    note: Type.string(),
});

const ChannelStatsHistorySchema = createSchema({
    id: Type.string({ required: true }),
    history: Type.array().of({
        timestamp: Type.number({ required: true }),
        subscriberCount: Type.number(),
        viewCount: Type.number(),
        videoCount: Type.number(),
        level: Type.number(),
        followerCount: Type.number(), // TWCast/Mildom specific
    }),
    group: Type.string({ required: true }),
    platform: Type.string({ required: true, enum: PlatformData }),
});

export type ChannelsProps = ExtractProps<typeof ChannelsSchema>;
export type ChannelsDocs = ExtractDoc<typeof ChannelsSchema>;
export type ChannelStatsHistProps = ExtractProps<typeof ChannelStatsHistorySchema>;
export type ChannelStatsHistDocs = ExtractDoc<typeof ChannelStatsHistorySchema>;

export const ChannelsData = typedModel("ChannelsData", ChannelsSchema, undefined, undefined, {
    paginate: async function (
        query: FilterQuery<ChannelsProps>,
        options?: IPaginateOptions
    ): Promise<IPaginateResults<ChannelsProps>> {
        const cursor = _.get(options, "cursor", undefined);
        const limit = fallbackNaN(parseInt, _.get(options, "limit", 25), 25);
        const projection = _.get(options, "project", undefined);
        const sortKey = remapSchemaToDatabase(_.get(options, "sortBy", "_id"), "ch", "name");
        const sortMeth: any = {};
        sortMeth[sortKey] = ["asc", "ascending"].includes(_.get(options, "sortOrder", "asc").toLowerCase())
            ? 1
            : -1;
        const paginationParams: any = {
            first: limit,
        };
        if (typeof cursor === "string" && cursor.length > 0) {
            paginationParams["after"] = cursor;
        }
        paginationParams["sort"] = sortMeth;
        if (typeof projection === "object" && Object.keys(projection).length > 0) {
            paginationParams["projection"] = projection;
        }
        paginationParams["query"] = query;
        const promises = [
            {
                // @ts-ignore
                fn: findPaginationMongoose.bind(findPaginationMongoose, this, paginationParams),
                name: "docs",
            },
            // @ts-ignore
            { fn: this.countDocuments.bind(this, query), name: "count" },
        ].map((req) =>
            req
                .fn()
                // @ts-ignore
                .then((res: FindPaginatedResult<ChannelsProps> | number) => {
                    return res;
                })
                .catch(() => {
                    if (req.name === "count") {
                        return 0;
                    }
                    return {};
                })
        );
        // @ts-ignore
        const [docsResults, countResults]: [FindPaginatedResult<ChannelsProps>, number] = await Promise.all(
            promises
        );
        const allDocuments = docsResults.edges.map((o) => o.node);
        return {
            docs: allDocuments,
            pageInfo: {
                totalData: countResults,
                hasNextPage: docsResults.pageInfo.hasNextPage,
                nextCursor: docsResults.pageInfo.endCursor,
            },
        };
    },
});
export const ChannelStatsHistData = typedModel("ChannelStatsHistData", ChannelStatsHistorySchema);
