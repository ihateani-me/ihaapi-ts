import _ from "lodash";
import { FilterQuery } from "mongoose";
import { FindPaginatedResult } from "mongo-cursor-pagination-alt";
import { createSchema, ExtractDoc, ExtractProps, Type, typedModel } from "ts-mongoose";

import {
    findPaginationMongoose,
    IPaginateOptions,
    IPaginateResults,
    remapSchemaToDatabase,
} from "./pagination";
import { LiveStatus, PlatformData } from "./extras";

import { fallbackNaN } from "../../utils/swissknife";

const VideosSchema = createSchema({
    id: Type.string({ required: true }),
    room_id: Type.string(), // B2 Specific
    title: Type.string({ required: true }),
    status: Type.string({ required: true, enum: LiveStatus }),
    timedata: Type.object({ required: true }).of({
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
    channel_id: Type.string({ required: true }),
    thumbnail: Type.string({ required: true }),
    group: Type.string({ required: true }),
    platform: Type.string({ required: true, enum: PlatformData }),
    is_missing: Type.boolean(),
    is_premiere: Type.boolean(),
    is_member: Type.boolean(),
});

const ViewersDataSchema = createSchema({
    id: Type.string({ required: true }),
    viewersData: Type.array({ required: true }).of({
        timestamp: Type.number({ required: true }),
        viewers: Type.number(),
    }),
    group: Type.string({ required: true }),
    platform: Type.string({ required: true, enum: PlatformData }),
});

export type ViewersProps = ExtractProps<typeof ViewersDataSchema>;
export type VideoProps = ExtractProps<typeof VideosSchema>;

export const ViewersData = typedModel("ViewersData", ViewersDataSchema);
export const VideosData = typedModel("VideosData", VideosSchema, undefined, undefined, {
    paginate: async function (
        query: FilterQuery<VideoProps>,
        options?: IPaginateOptions
    ): Promise<IPaginateResults<VideoProps>> {
        // @ts-ignore
        const cursor = _.get(options, "cursor", undefined);
        const limit = fallbackNaN(parseInt, _.get(options, "limit", 25), 25);
        const projection = _.get(options, "project", undefined);
        const sortKey = remapSchemaToDatabase(_.get(options, "sortBy", "_id"), "v", "timedata.startTime");
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
            // @ts-ignore
            { fn: findPaginationMongoose.bind(findPaginationMongoose, this, paginationParams), name: "docs" },
            { fn: this.countDocuments.bind(this, query), name: "count" },
        ].map((req) =>
            // @ts-ignore
            req
                .fn()
                // @ts-ignore
                .then((res: FindPaginatedResult<VideoProps> | number) => {
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
        const [docsResults, countResults]: [FindPaginatedResult<VideoProps>, number] = await Promise.all(
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

export type VideoDocs = ExtractDoc<typeof VideosSchema>;
export type ViewersDocs = ExtractDoc<typeof ViewersDataSchema>;
