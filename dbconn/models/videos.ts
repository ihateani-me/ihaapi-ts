import _ from "lodash";
import { FilterQuery } from "mongoose";
import { createSchema, Type, typedModel, ExtractProps, ExtractDoc } from "ts-mongoose";

import { LiveStatus, PlatformData } from "./extras";
import { IPaginateOptions, IPaginateResults, remapSchemaToDatabase } from "./pagination";

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
                .then((res: VideoProps[] | number) => {
                    return res;
                })
                .catch((res) => {
                    if (req.name === "count") {
                        return 0;
                    }
                    return {};
                })
        ))
        // @ts-ignore
        let [docsResults, countResults]: [VideoProps[], number] = await Promise.all(promises);
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
    },
});

export type VideoDocs = ExtractDoc<typeof VideosSchema>;
export type ViewersDocs = ExtractDoc<typeof ViewersDataSchema>;
