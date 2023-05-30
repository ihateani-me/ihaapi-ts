import { FilterQuery } from "mongoose";
import { getModelForClass, prop, PropType, ReturnModelType } from "@typegoose/typegoose";

import { PlatformData, PlatformDataType } from "./extras";
import paginationHelper, { IPaginateOptions } from "./pagination";

export class Channels {
    @prop({ required: true, type: () => String })
    public id!: string;
    @prop({ type: () => String })
    public yt_custom_id?: string;
    @prop({ type: () => String })
    public room_id?: string;
    @prop({ type: () => String })
    public user_id?: string;
    @prop({ required: true, type: () => String })
    public name!: string;
    @prop({ type: () => String })
    public en_name?: string;
    @prop({ type: () => String })
    public description?: string;
    @prop({ type: () => String })
    public publishedAt?: string;
    @prop({ type: () => Number })
    public subscriberCount?: number;
    @prop({ type: () => Number })
    public viewCount?: number;
    @prop({ type: () => Number })
    public videoCount?: number;
    @prop({ type: () => Number })
    public followerCount?: number;
    @prop({ type: () => Number })
    public level?: number;
    @prop({ required: true, type: () => String })
    public thumbnail!: string;
    @prop({ required: true, type: () => String })
    public group!: string;
    @prop({ required: true, enum: PlatformData, type: () => String })
    public platform!: PlatformDataType;
    @prop({ type: () => Boolean })
    public is_live?: boolean;
    @prop({ type: () => Boolean })
    public is_retired?: boolean;
    @prop({ type: () => String })
    public note?: string;

    public static async paginate(
        this: ReturnModelType<typeof Channels>,
        query: FilterQuery<Channels>,
        options?: IPaginateOptions
    ) {
        return await paginationHelper<typeof Channels>(this, query, options);
    }
}

class ChannelStatsHistory {
    @prop({ required: true, type: () => Number })
    public timestamp!: number;
    @prop({ type: () => Number })
    public subscriberCount?: number;
    @prop({ type: () => Number })
    public viewCount?: number;
    @prop({ type: () => Number })
    public videoCount?: number;
    @prop({ type: () => Number })
    public level?: number;
    @prop({ type: () => Number })
    public followerCount?: number; // TWCast/Mildom specific
}

export class ChannelStats {
    @prop({ required: true, type: () => String })
    public id!: string;
    @prop({ type: () => [ChannelStatsHistory] }, PropType.ARRAY)
    public history?: ChannelStatsHistory[];
    @prop({ required: true, type: () => String })
    public group!: string;
    @prop({ required: true, enum: PlatformData, type: () => String })
    public platform!: PlatformDataType;
}

export const ChannelsModel = getModelForClass(Channels, {
    schemaOptions: {
        collection: "channelsdatas",
    },
});
export const ChannelStatsModel = getModelForClass(ChannelStats, {
    schemaOptions: {
        collection: "channelstatshistdatas",
    },
});
