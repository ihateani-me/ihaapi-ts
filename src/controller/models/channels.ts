import { FilterQuery } from "mongoose";
import { getModelForClass, prop, ReturnModelType } from "@typegoose/typegoose";

import { PlatformData, PlatformDataType } from "./extras";
import paginationHelper, { IPaginateOptions } from "./pagination";

export class Channels {
    @prop({ required: true })
    public id!: string;
    @prop()
    public yt_custom_id?: string;
    @prop()
    public room_id?: string;
    @prop()
    public user_id?: string;
    @prop({ required: true })
    public name!: string;
    @prop()
    public en_name?: string;
    @prop()
    public description?: string;
    @prop()
    public publishedAt?: string;
    @prop()
    public subscriberCount?: number;
    @prop()
    public viewCount?: number;
    @prop()
    public videoCount?: number;
    @prop()
    public followerCount?: number;
    @prop()
    public level?: number;
    @prop({ required: true })
    public thumbnail!: string;
    @prop({ required: true })
    public group!: string;
    @prop({ required: true, enum: PlatformData })
    public platform!: PlatformDataType;
    @prop()
    public is_live?: boolean;
    @prop()
    public is_retired?: boolean;
    @prop()
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
    @prop({ required: true })
    public timestamp!: number;
    @prop()
    public subscriberCount?: number;
    @prop()
    public viewCount?: number;
    @prop()
    public videoCount?: number;
    @prop()
    public level?: number;
    @prop()
    public followerCount?: number; // TWCast/Mildom specific
}

export class ChannelStats {
    @prop({ required: true })
    public id!: string;
    @prop()
    public history?: ChannelStatsHistory[];
    @prop({ required: true })
    public group!: string;
    @prop({ required: true, enum: PlatformData })
    public platform!: PlatformDataType;
}

export const ChannelsModel = getModelForClass(Channels);
export const ChannelStatsModel = getModelForClass(ChannelStats);
