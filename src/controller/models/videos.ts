import { FilterQuery } from "mongoose";
import { createSchema, ExtractDoc, ExtractProps, Type, typedModel } from "ts-mongoose";

import { IPaginateOptions, IPaginateResults, wrapStaticsToNonAsync } from "./pagination";
import { LiveStatus, PlatformData } from "./extras";
import { logger as MainLogger } from "../../utils/logger";

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
    paginate: function (
        query: FilterQuery<VideoProps>,
        options?: IPaginateOptions
    ): Promise<IPaginateResults<VideoProps>> {
        const logger = MainLogger.child({ cls: "MongooseVideosData", fn: "paginate" });
        const executesPromises = wrapStaticsToNonAsync(this, "v", query, options)
            .then((results) => {
                return results;
            })
            .catch((err) => {
                logger.error(`Failed to fetch Video database, ${err.toString()}`);
                console.error(err);
                return {
                    docs: [],
                    pageInfo: {
                        totalData: 0,
                        hasNextPage: false,
                        nextCursor: null,
                    },
                };
            });
        return executesPromises;
    },
});

export type VideoDocs = ExtractDoc<typeof VideosSchema>;
export type ViewersDocs = ExtractDoc<typeof ViewersDataSchema>;
