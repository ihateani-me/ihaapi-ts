import { FilterQuery } from "mongoose";
import { getModelForClass, prop, PropType, ReturnModelType } from "@typegoose/typegoose";

import { LiveStatus, LiveStatusType, PlatformData, PlatformDataType } from "./extras";
import paginationHelper, { IPaginateOptions } from "./pagination";

class VideoTimes {
    @prop({ type: () => Number })
    public scheduledStartTime?: number;
    @prop({ type: () => Number })
    public startTime?: number;
    @prop({ type: () => Number })
    public endTime?: number;
    @prop({ type: () => Number })
    public lateTime?: number;
    @prop({ type: () => Number })
    public duration?: number;
    @prop({ type: () => String })
    public publishedAt?: string;
}

class VideoCollabMentioned {
    @prop({ required: true, type: () => String })
    public id!: string;
    @prop({ enum: PlatformData, required: true, type: () => String })
    public platform!: PlatformDataType;
}

export class Video {
    @prop({ required: true, type: () => String })
    public id!: string;
    @prop({ type: () => String })
    public schedule_id?: string; // TTV Specific, used for schedule checking :)
    @prop({ type: () => String })
    public room_id?: string; // B2 Specific
    @prop({ required: true, type: () => String })
    public title!: string;
    @prop({ required: true, enum: LiveStatus, type: () => String })
    public status!: LiveStatusType;
    @prop({ required: true, type: () => VideoTimes })
    public timedata!: VideoTimes;
    @prop({ type: () => Number })
    public viewers?: number;
    @prop({ type: () => Number })
    public peakViewers?: number;
    @prop({ type: () => Number })
    public averageViewers?: number;
    @prop({ type: () => String })
    public channel_uuid?: string; // Twitch specific
    @prop({ required: true, type: () => String })
    public channel_id!: string;
    @prop({ type: () => [VideoCollabMentioned] }, PropType.ARRAY)
    public mentioned?: VideoCollabMentioned[];
    @prop({ required: true, type: () => String })
    public thumbnail!: string;
    @prop({ required: true, type: () => String })
    public group!: string;
    @prop({ required: true, enum: PlatformData, type: () => String })
    public platform!: PlatformDataType;
    @prop({ type: () => Boolean })
    public is_missing?: boolean;
    @prop({ type: () => Boolean })
    public is_premiere?: boolean;
    @prop({ type: () => Boolean })
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
    @prop({ required: true, type: () => Number })
    public timestamp!: number;
    @prop({ type: () => Number })
    public viewers?: number;
}

export class VideoView {
    @prop({ required: true, type: () => String })
    public id!: string;
    @prop({ required: true, type: () => [VideoViewTimestamp] }, PropType.ARRAY)
    public viewersData!: VideoViewTimestamp[];
    @prop({ required: true, type: () => String })
    public group!: string;
    @prop({ required: true, enum: PlatformData, type: () => String })
    public platform!: PlatformDataType;
}

export const VideoModel = getModelForClass(Video, {
    schemaOptions: {
        collection: "videosdatas",
    },
});
export const VideoViewModel = getModelForClass(VideoView, {
    schemaOptions: {
        collection: "viewersdatas",
    },
});
