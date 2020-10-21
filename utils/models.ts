/*
 * Base models
*/

export interface LiveBaseModels {
    id: string;
    title: string;
    channel: string;
    startTime: number;
    platform: string;
}

export interface ChannelBaseModel {
    id: string;
    name: string;
    thumbnail: string;
    description?: string;
    platform: string;
}

/*
 * Live Data Models.
*/

export interface BilibiliData extends LiveBaseModels {
    room_id: number;
    channel_name: string;
    thumbnail?: string;
    viewers?: number;
}

export interface YouTubeData extends LiveBaseModels {
    endTime: number | null;
    viewers?: number;
    status: string;
    group: string;
}

export interface TwitchData extends LiveBaseModels {
    channel_id: string;
    thumbnail: string;
}

export interface TwitcastingData extends LiveBaseModels {
    viewers: number;
    peakViewers: number;
}



/*
 * Channel Models.
*/

/**
 * BiliBili Channel Models
 * 
 * Inherited from **`ChannelBaseModel`**
 * - id
 * - room_id
 * - name
 * - description
 * - publishedAt
 * - thumbnail
 * - subscriberCount
 * - viewCount
 * - videoCount
 * - live
 * - platform
 */
export interface BiliBiliChannel extends ChannelBaseModel {
    room_id: string;
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
    live: boolean;
}

/**
 * Youtube Channel Models
 * 
 * Inherited from **`ChannelBaseModel`**
 * - id
 * - name
 * - description
 * - publishedAt
 * - thumbnail
 * - group
 * - subscriberCount
 * - viewCount
 * - videoCount
 * - platform
 */
export interface YouTubeChannel extends ChannelBaseModel {
    publishedAt: string;
    group: string;
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
}

/**
 * Twitch Channel Models
 * 
 * Inherited from **`ChannelBaseModel`**
 * - id
 * - user_id
 * - name
 * - description
 * - thumbnail
 * - followerCount
 * - viewCount
 * - platform
 */
export interface TwitchChannel extends ChannelBaseModel {
    user_id: string;
    followerCount: number;
    viewCount: number;
}

/**
 * Twitcasting Channel Models
 * 
 * Inherited from **`ChannelBaseModel`**
 * - id
 * - name
 * - description
 * - thumbnail
 * - followerCount
 * - level
 * - platform
 */
export interface TwitcastingChannel extends ChannelBaseModel {
    followerCount: number;
    level: number;
}


/*
 * Array Models.
*/

export interface YTLiveArray<T> {
    [key: string]: T;
}

export interface ChannelArray<T> {
    [channel_id: string]: T;
}

export interface YTFilterArgs {
    group?: string;
    status?: string;
    fields?: string;
    sort?: string;
    order?: string;
}

export interface LiveMap<T> {
    live?: T;
    upcoming?: T;
    ended?: T;
    cached?: boolean;
}

export interface ChannelMap<T> {
    channels?: T;
    cached?: boolean;
}
