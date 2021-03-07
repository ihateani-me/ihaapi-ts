import { FilterQuery } from "mongoose";
import { createSchema, ExtractDoc, ExtractProps, Type, typedModel } from "ts-mongoose";

import { PlatformData } from "./extras";
import { IPaginateOptions, IPaginateResults, wrapStaticsToNonAsync } from "./pagination";

import { logger as MainLogger } from "../../utils/logger";

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
    paginate: function (
        query: FilterQuery<ChannelsProps>,
        options?: IPaginateOptions
    ): Promise<IPaginateResults<ChannelsProps>> {
        const logger = MainLogger.child({ cls: "MongooseChannelsData", fn: "paginate" });
        const executesPromises = wrapStaticsToNonAsync(this, "ch", query, options)
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
export const ChannelStatsHistData = typedModel("ChannelStatsHistData", ChannelStatsHistorySchema);
