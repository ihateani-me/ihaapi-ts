import _ from "lodash";
import { FilterQuery } from "mongoose";
import { createSchema, Type, typedModel, ExtractProps, ExtractDoc } from "ts-mongoose";
import { FindPaginatedResult } from 'mongo-cursor-pagination-alt'

import { PlatformData } from "./extras";
import { findPaginationMongoose, IPaginateOptions, IPaginateResults, remapSchemaToDatabase } from "./pagination";

import { fallbackNaN } from "../../utils/swissknife";

const ChannelsSchema = createSchema(
    {
        id: Type.string({ required: true }),
        room_id: Type.string(), // Bilibili Specific
        user_id: Type.string(), // Twitch Specific
        name: Type.string({required: true}),
        en_name: Type.string(),
        description: Type.string(),
        publishedAt: Type.string(), // YT/TTV/B2 Specific
        subscriberCount: Type.number(),
        viewCount: Type.number(),
        videoCount: Type.number(),
        followerCount: Type.number(), // TWCast/Mildom specific
        level: Type.number(), // Mildom/TWCast specific
        thumbnail: Type.string({required: true}),
        group: Type.string({required: true}),
        platform: Type.string({required: true, enum: PlatformData}),
        is_live: Type.boolean(), // B2 Specific
    }
)

const ChannelStatsHistorySchema = createSchema(
    {
        id: Type.string({ required: true }),
        history: Type.array().of({
            timestamp: Type.number({required: true}),
            subscriberCount: Type.number(),
            viewCount: Type.number(),
            videoCount: Type.number(),
            followerCount: Type.number(), // TWCast/Mildom specific
        }),
        group: Type.string({required: true}),
        platform: Type.string({required: true, enum: PlatformData}),
    }
)

export type ChannelsProps = ExtractProps<typeof ChannelsSchema>;
export type ChannelsDocs = ExtractDoc<typeof ChannelsSchema>;
export type ChannelStatsHistProps = ExtractProps<typeof ChannelStatsHistorySchema>;
export type ChannelStatsHistDocs = ExtractDoc<typeof ChannelStatsHistorySchema>;

export const ChannelsData = typedModel("ChannelsData", ChannelsSchema, undefined, undefined, {
    paginate: async function (query: FilterQuery<ChannelsProps>, options?: IPaginateOptions): Promise<IPaginateResults<ChannelsProps>> {
        let cursor = _.get(options, "cursor", undefined);
        let limit = fallbackNaN(parseInt, _.get(options, "limit", 25), 25);
        let projection = _.get(options, "project", undefined);
        let sortKey = remapSchemaToDatabase(_.get(options, "sortBy", "_id"), "v", "timedata.startTime");
        let sortMeth = {};
        sortMeth[sortKey] = ["asc", "ascending"].includes(_.get(options, "sortOrder", "asc").toLowerCase()) ? 1 : -1;
        let paginationParams = {
            first: limit
        }
        if (typeof cursor === "string" && cursor.length > 0) {
            paginationParams["after"] = cursor;
        }
        paginationParams["sort"] = sortMeth;
        if (typeof projection === "object" && Object.keys(projection).length > 0) {
            paginationParams["projection"] = projection;
        }
        paginationParams["query"] = query;
        let promises = [{fn: findPaginationMongoose.bind(findPaginationMongoose, this, paginationParams), name: "docs"}, {fn: this.countDocuments.bind(this, query), "name": "count"}].map((req) => (
            req.fn()
                .then((res: FindPaginatedResult<ChannelsProps> | number) => {
                    return res;
                })
                .catch((res: any) => {
                    if (req.name === "count") {
                        return 0;
                    }
                    return {};
                })
        ))
        // @ts-ignore
        let [docsResults, countResults]: [FindPaginatedResult<ChannelsProps>, number] = await Promise.all(promises);
        let allDocuments = docsResults.edges.map(o => o.node);
        return {
            "docs": allDocuments,
            "pageInfo": {
                "totalData": countResults,
                "hasNextPage": docsResults.pageInfo.hasNextPage,
                "nextCursor": docsResults.pageInfo.endCursor,
            }
        }
    }
});
export const ChannelStatsHistData = typedModel("ChannelStatsHistData", ChannelStatsHistorySchema);
