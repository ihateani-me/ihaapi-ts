import moment from "moment-timezone";
import { gql } from "apollo-server-express";
import { GraphQLScalarType, Kind } from "graphql";

import { is_none } from "../../utils/swissknife";

export const DateTimeScalar = new GraphQLScalarType({
    name: "DateTime",
    description: "A datetime string format, using ISO 8601 format.",
    parseValue(value) {
        if (is_none(value)) {
            return null;
        }
        return moment.tz(value, "UTC");
    },
    serialize(value) {
        if (is_none(value)) {
            return null;
        }
        return value.valueOf();
    },
    parseLiteral(value) {
        if (value.kind === Kind.INT) {
            return parseInt(value.value, 10);
        } else if (value.kind === Kind.FLOAT) {
            return parseFloat(value.value);
        }
        return null;
    }
})


export const VTAPIv2 = gql`
    """
    A datetime string format, using ISO 8601 format.
    """
    scalar DateTime

    """
    The Platform the stream was running on, its self-explanatory
    """
    enum PlatformName {
        youtube
        bilibili
        twitch
        twitcasting
        mildom
    }

    """
    The stream status
    """
    enum LiveStatus {
        "Currently live stream"
        live
        "Upcoming stream"
        upcoming
        "Past stream with maximum retainability of 6 hours"
        past
    }

    """
    Sort order for the returned data, default are ascending/asc
    The sort order use sort_by key parameters
    """
    enum SortOrder {
        "Ascending Order"
        ascending
        "Descending Order"
        descending
        "Ascending Order (shorthand)"
        asc
        "Descending Order (shorthand)"
        desc
    }

    """
    A time data for a video, if it's a number it's a UNIX timestamp in seconds
    """
    type VideoTime {
        "The stream real start time (UNIX timestamp, seconds)"
        startTime: Int
        "The stream end time (UNIX timestamp, seconds)"
        endTime: Int
        "The stream scheduled start time (UNIX timestamp, seconds)"
        scheduledStartTime: Int
        "The video publication date in DateTime format"
        publishedAt: DateTime
        "How late the stream is between scheduled and real start time (in seconds)"
        lateBy: Int
        "Duration of the stream (in seconds)"
        duration: Int
    }

    """
    Channel stats growth data
    """
    type ChannelGrowth {
        "Growth in 1 day or last day"
        oneDay: Int!
        "Growth in the last week"
        oneWeek: Int!
        "Growth in the last 2 weeks"
        twoWeeks: Int!
        "Growth in the last 1 month"
        oneMonth: Int!
        "Growth in the last 6 month"
        sixMonths: Int!
        "Growth in the last 1 year"
        oneYear: Int!
        "Timestamp of last updated (UNIX time, in seconds)"
        lastUpdated: Int!
    }

    """
    Channel stats growth data, for now only views and subscribers are tracked.
    """
    type ChannelGrowthData @cacheControl(maxAge: 1800) {
        "Subscriber growth (or follower if it's Twitch/Twitcasting) data"
        subscribersGrowth: ChannelGrowth
        "Channel views growth data"
        viewsGrowth: ChannelGrowth
    }

    """
    Statistics for a channel
    Not all stats are available so please do test it channel query
    """
    type ChannelStatistics @cacheControl(maxAge: 3600) {
        "Subscriber/Follower amount"
        subscriberCount: Int
        "Total channel views"
        viewCount: Int
        "Uploaded/Archive amount that are public"
        videoCount: Int
        "User Level (Twitcasting only!)"
        level: Int
    }

    """
    Pagination object
    """
    type PageInfo {
        "Total returned results for this page"
        total_results: Int!
        "Total results per page that are specified (with limit)"
        results_per_page: Int!
        "Next cursor identifier for pagination"
        nextCursor: String
        "Does it have a next page or not."
        hasNextPage: Boolean!
    }

    """
    The channel object, this include most of the information of a channel
    Please refer to the old API documentation to see what's used or not
    """
    type ChannelObject @cacheControl(maxAge: 1800) {
        "Channel ID or Username (For Twitch)"
        id: ID!
        "Channel User ID (Twitch Only!)"
        user_id: String
        "Channel Room ID (BiliBili Only!)"
        room_id: String
        "The channel name"
        name: String!
        "The channel name in normal English (doesn't mean it's translated)"
        en_name: String
        "The channel description"
        description: String!
        "The channel publication time in DateTime format"
        publishedAt: DateTime
        "The channel profile picture"
        image: String!
        "The channel statistics (subs, view, total videos)"
        statistics: ChannelStatistics! @cacheControl(maxAge: 3600)
        "Channel growth data"
        growth: ChannelGrowthData
        "The channel group/organization"
        group: String
        "Is the channel live or not? (BiliBili Only!)"
        is_live: Boolean
        "The channel data platform"
        platform: PlatformName!
    }

    """
    The Live/Upcoming/Ended Video Object
    Not all platform have the value of key you're searching
    You can refer to the old API Docs to cross-check
    """
    type LiveObject {
        "The stream ID, it usually use the provided Video ID"
        id: ID!
        "Room ID that are being used (BiliBili Only!)"
        room_id: Int
        "The stream title"
        title: String!
        "The stream time data (start/end/etc)"
        timeData: VideoTime!
        "The channel ID"
        channel_id: ID!
        "The channel object/information"
        channel: ChannelObject! @cacheControl(maxAge: 1800)
        "The stream thumbnail"
        thumbnail: String
        "The stream status"
        status: LiveStatus!
        "Total current viewers (for BiliBili, it's popularity)"
        viewers: Int
        "The peak viewers for the stream"
        peakViewers: Int
        "Average viewers of the streams (only available when it's ended)"
        averageViewers: Int
        "Is the video privated or not? if it's null assume no"
        is_missing: Boolean
        "Is it a premiere video or not? if it's null assume no"
        is_premiere: Boolean
        "Is it a member stream or not? if it's null assume no (Youtube/Twitcasting only). Started being checked since 27 Dec 2020 23:00 JST"
        is_member: Boolean
        "The channel group/organization"
        group: String
        "The stream platform being used"
        platform: PlatformName!
    }

    """
    Live/Upcoming/Ended resources that includes array of LiveObject
    and a pagination information to paginate through.
    """
    type LivesResource {
        "Total video in all page combined"
        _total: Int!
        "LiveObject results"
        items: [LiveObject!]! @cacheControl(maxAge: 60)
        "LiveObject pagination info"
        pageInfo: PageInfo
    }

    """
    Channels resources that includes array of ChannelObject
    and a pagination information to paginate through.
    """
    type ChannelsResource {
        "Total channel in all page combined"
        _total: Int!
        "ChannelObject results"
        items: [ChannelObject!]! @cacheControl(maxAge: 1800)
        "Channel pagination info, only used in channels() query"
        pageInfo: PageInfo!
    }

    """
    Existing groups that exist on the database.
    """
    type GroupsResource {
        items: [String!]! @cacheControl(maxAge: 300)
    }
`;

// "Enum"
export type SortOrder = | "ascending" | "descending" | "asc" | "desc";
export type LiveStatus = | "live" | "upcoming" | "past" | "video";
export type PlatformName = | "youtube" | "bilibili" | "twitch" | "twitcasting" | "mildom";

// Return-type
export interface PageInfo {
    total_results: number
    results_per_page: number
    nextCursor?: string
    hasNextPage: boolean
}

export interface ChannelStatistics {
    subscriberCount: number
    viewCount?: number
    videoCount?: number
    level?: number
}

export interface ChannelGrowth {
    oneDay: number
    oneWeek: number
    twoWeeks: number
    oneMonth: number
    sixMonths: number
    oneYear: number
    lastUpdated: number
}

export interface VideoTime {
    startTime?: number
    endTime?: number
    scheduledStartTime?: number
    publishedAt?: string
    lateBy?: number
    duration?: number
}

export interface ChannelGrowthObject {
    subscribersGrowth?: ChannelGrowth
    viewsGrowth?: ChannelGrowth
}

export interface ChannelObject {
    id: string | number
    user_id?: string
    room_id?: string
    name: string
    en_name?: string
    description: string
    publishedAt?: string
    image: string
    statistics?: ChannelStatistics
    growth?: ChannelGrowthObject
    group?: string
    is_live?: boolean
    platform: PlatformName
    pageInfo?: PageInfo
}

export interface LiveObject {
    id: string
    room_id?: number
    title: string
    timeData: VideoTime
    channel_id: string | number
    channel?: ChannelObject
    thumbnail?: string
    status: LiveStatus
    viewers?: number
    peakViewers?: number
    averageViewers?: number
    is_missing?: boolean
    is_premiere?: boolean
    is_member?: boolean
    group: string
    platform?: PlatformName
    pageInfo?: PageInfo
}

// Request-type params/args
export interface LiveObjectParams {
    channel_id?: string[]
    status?: LiveStatus[]
    groups?: string[]
    platforms?: PlatformName[]
    max_lookback?: number
    max_scheduled_time?: number
    limit?: number
    sort_by?: string
    sort_order?: SortOrder
    cursor?: string
}

export interface ChannelObjectParams {
    id?: string[],
    groups?: string[],
    platforms?: PlatformName[],
    sort_by?: string
    sort_order?: SortOrder
    cursor?: string
}

export interface LivesResource {
    _total: number
    items: LiveObject[]
    pageInfo: PageInfo
}

export interface ChannelsResource {
    _total: number
    items: ChannelObject[]
    pageInfo: PageInfo
}

export interface GroupsResource {
    items: string[]
}