import _ from "lodash";
import { FilterQuery } from "mongoose";
import { createSchema, Type, typedModel, ExtractProps, ExtractDoc } from "ts-mongoose";

import { PlatformData } from "./extras";
import { IPaginateOptions, IPaginateResults, remapSchemaToDatabase } from "./pagination";

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
        // @ts-ignore
        let cursor = _.get(options, "cursor", undefined);
        let limit = fallbackNaN(parseInt, _.get(options, "limit", 25), 25) + 1;
        let projection = _.get(options, "project", undefined);
        let aggregateShits = [];
        let sortKey = remapSchemaToDatabase(_.get(options, "sortBy", "_id"), "v", "timedata.startTime");
        let sortMeth = {};
        sortMeth[sortKey] = ["asc", "ascending"].includes(_.get(options, "sortOrder", "asc").toLowerCase()) ? 1 : -1;
        aggregateShits.push({
            "$sort": sortMeth
        })
        let cleanQuery = _.cloneDeep(query);
        if (typeof cursor === "string" && cursor.length > 0) {
            // @ts-ignore
            query["_id"] = {"$gte": new Types.ObjectId(cursor)};
        }
        aggregateShits.push({
            "$match": query,
        })
        if (typeof projection === "object" && Object.keys(projection).length > 0) {
            aggregateShits.push({
                "$project": projection,
            })
        }
        aggregateShits.push({
            "$limit": limit
        })
        let promises = [{fn: this.aggregate.bind(this), name: "docs"}, {fn: this.countDocuments.bind(this), "name": "count"}].map((req) => (
            // @ts-ignore
            req.fn(req.name === "count" ? query : aggregateShits)
                // @ts-ignore
                .then((res: ChannelsProps[] | number) => {
                    return res;
                })
                .catch((_res) => {
                    if (req.name === "count") {
                        return 0;
                    }
                    return {};
                })
        ))
        // @ts-ignore
        let [docsResults, countResults]: [ChannelsProps[], number] = await Promise.all(promises);
        let hasNext = docsResults.length === limit ? true : false;
        let nextCursor = null;
        if (hasNext) {
            let tNextCursor = _.get(_.last(docsResults), "_id", "").toString();
            if (tNextCursor !== "") {
                nextCursor = tNextCursor;
            }
        }
        docsResults = _.take(docsResults, limit - 1);
        return {
            "docs": docsResults,
            "pageInfo": {
                "totalData": countResults,
                "hasNextPage": hasNext,
                "nextCursor": nextCursor
            }
        }
    }
});
export const ChannelStatsHistData = typedModel("ChannelStatsHistData", ChannelStatsHistorySchema);
