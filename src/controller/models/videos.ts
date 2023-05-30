import { FilterQuery } from "mongoose";
import { getModelForClass, prop, ReturnModelType } from "@typegoose/typegoose";

import { LiveStatus, LiveStatusType, PlatformData, PlatformDataType } from "./extras";
import paginationHelper, { IPaginateOptions } from "./pagination";

class VideoTimes {
    @prop()
    public scheduledStartTime?: number;
    @prop()
    public startTime?: number;
    @prop()
    public endTime?: number;
    @prop()
    public lateTime?: number;
    @prop()
    public duration?: number;
    @prop()
    public publishedAt?: string;
}

class VideoCollabMentioned {
    @prop({ required: true })
    public id!: string;
    @prop({ enum: PlatformData, required: true })
    public platform!: PlatformDataType;
}

export class Video {
    @prop({ required: true })
    public id!: string;
    @prop()
    public schedule_id?: string; // TTV Specific, used for schedule checking :)
    @prop()
    public room_id?: string; // B2 Specific
    @prop({ required: true })
    public title!: string;
    @prop({ required: true, enum: LiveStatus })
    public status!: LiveStatusType;
    @prop({ required: true })
    public timedata!: VideoTimes;
    @prop()
    public viewers?: number;
    @prop()
    public peakViewers?: number;
    @prop()
    public averageViewers?: number;
    @prop()
    public channel_uuid?: string; // Twitch specific
    @prop({ required: true })
    public channel_id!: string;
    @prop()
    public mentioned?: VideoCollabMentioned[];
    @prop({ required: true })
    public thumbnail!: string;
    @prop({ required: true })
    public group!: string;
    @prop({ required: true, enum: PlatformData })
    public platform!: PlatformDataType;
    @prop()
    public is_missing?: boolean;
    @prop()
    public is_premiere?: boolean;
    @prop()
    public is_member?: boolean;

    public static async paginate(
        this: ReturnModelType<typeof Video>,
        query: FilterQuery<Video>,
        options?: IPaginateOptions
    ) {
        return await paginationHelper<typeof Video>(this, query, options);
    }
}
class VideoViewTimestamp {
    @prop({ required: true })
    public timestamp!: number;
    @prop()
    public viewers?: number;
}

export class VideoView {
    @prop({ required: true })
    public id!: string;
    @prop({ required: true })
    public viewersData!: VideoViewTimestamp[];
    @prop({ required: true })
    public group!: string;
    @prop({ required: true, enum: PlatformData })
    public platform!: PlatformDataType;
}

export const VideoModel = getModelForClass(Video);
export const VideoViewModel = getModelForClass(VideoView);
