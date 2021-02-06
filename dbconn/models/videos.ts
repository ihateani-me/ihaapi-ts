import _ from "lodash";
import { FilterQuery } from "mongoose";
import { createSchema, Type, typedModel, ExtractProps, ExtractDoc } from "ts-mongoose";
import { FindPaginatedResult } from 'mongo-cursor-pagination-alt'

import { LiveStatus, PlatformData } from "./extras";
import { IPaginateOptions, IPaginateResults, remapSchemaToDatabase, findPaginationMongoose } from "./pagination";

import { fallbackNaN } from "../../utils/swissknife";

const VideosSchema = createSchema(
    {
        id: Type.string({ required: true }),
        room_id: Type.string(), // B2 Specific
        title: Type.string({required: true}),
        status: Type.string({required: true, enum: LiveStatus}),
        timedata: Type.object({required: true}).of({
            scheduledStartTime: Type.number(),
            startTime: Type.number(),
            endTime: Type.number(),
            lateTime: Type.number(),
            duration: Type.number(),
            publishedAt: Type.string(),
        }),
        viewers: Type.number(),
        peakViewers: Type.number(),
        averageViewers: Type.number(),
        channel_uuid: Type.string(), // Twitch specific
        channel_id: Type.string({required: true}),
        thumbnail: Type.string({required: true}),
        group: Type.string({required: true}),
        platform: Type.string({required: true, enum: PlatformData}),
        is_missing: Type.boolean(),
        is_premiere: Type.boolean(),
        is_member: Type.boolean(),
    }
)

const ViewersDataSchema = createSchema({
    id: Type.string({required: true}),
    viewersData: Type.array({required: true}).of({
        timestamp: Type.number({required: true}),
        viewers: Type.number(),
    }),
    group: Type.string({required: true}),
    platform: Type.string({required: true, enum: PlatformData}),
})

export type ViewersProps = ExtractProps<typeof ViewersDataSchema>;
export type VideoProps = ExtractProps<typeof VideosSchema>;

export const ViewersData = typedModel("ViewersData", ViewersDataSchema);
export const VideosData = typedModel("VideosData", VideosSchema, undefined, undefined, {
    paginate: async function (query: FilterQuery<VideoProps>, options?: IPaginateOptions): Promise<IPaginateResults<VideoProps>> {
        // @ts-ignore
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
            // @ts-ignore
            req.fn()
                // @ts-ignore
                .then((res: FindPaginatedResult<VideoProps> | number) => {
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
        let [docsResults, countResults]: [FindPaginatedResult<VideoProps>, number] = await Promise.all(promises);
        let allDocuments = docsResults.edges.map(o => o.node);
        return {
            "docs": allDocuments,
            "pageInfo": {
                "totalData": countResults,
                "hasNextPage": docsResults.pageInfo.hasNextPage,
                "nextCursor": docsResults.pageInfo.endCursor,
            }
        }
    },
});

export type VideoDocs = ExtractDoc<typeof VideosSchema>;
export type ViewersDocs = ExtractDoc<typeof ViewersDataSchema>;