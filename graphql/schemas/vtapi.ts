import { gql } from "apollo-server-express";



export const VTAPIv2 = gql`
    directive @deprecated(
        reason: String = "No longer supported"
    ) on FIELD_DEFINITION | ENUM_VALUE

    enum PlatformName {
        youtube
        bilibili
        twitch
        twitcasting
    }

    enum LiveStatus {
        live
        upcoming
        past
    }

    enum SortOrder {
        ascending
        descending
        asc
        desc
    }

    type ChannelStatistics {
        subscriberCount: Int!
        viewCount: Int
        videoCount: Int
        level: Int
    }

    type ChannelObject {
        id: ID!
        user_id: String
        room_id: String
        name: String!
        description: String!
        publishedAt: String
        thumbnail: String!
        statistics: ChannelStatistics!
        group: String!
        is_live: Boolean
        platform: PlatformName!
    }

    type LiveObject {
        id: ID!
        room_id: Int
        title: String!
        startTime: Int!
        endTime: Int
        channel_id: ID!
        channel: ChannelObject!
        thumbnail: String
        status: LiveStatus!
        viewers: Int!
        peakViewers: Int
        group: String!
        platform: PlatformName!
    }

    type Query {
        live(
            channel_id: [ID],
            groups: [String],
            platforms: [PlatformName],
            sort_by: String = "startTime"
            sort_order: SortOrder = asc
        ): [LiveObject!]!
        upcoming(
            channel_id: [ID],
            groups: [String],
            platforms: [PlatformName],
            sort_by: String = "startTime"
            sort_order: SortOrder = asc
        ): [LiveObject!]!
        ended(
            channel_id: [ID],
            groups: [String],
            platforms: [PlatformName],
            sort_by: String = "endTime"
            sort_order: SortOrder = asc
        ): [LiveObject!]!
        channels(
            id: [ID],
            groups: [String],
            platforms: [PlatformName],
            sort_by: String = "id"
            sort_order: SortOrder = asc
        ): [ChannelObject!]!
    }
`;

// "Enum"
export type SortOrder = | "ascending" | "descending" | "asc" | "desc";
export type LiveStatus = | "live" | "upcoming" | "past"
export type PlatformName = | "youtube" | "bilibili" | "twitch" | "twitcasting";

// Return-type

export interface ChannelStatistics {
    subscriberCount: number
    viewCount?: number
    videoCount?: number
    level?: number
}

export interface ChannelObject {
    id: string | number
    user_id?: string
    room_id?: string
    name: string
    description: string
    publishedAt?: string
    thumbnail: string
    statistics: ChannelStatistics
    group?: string
    is_live?: boolean
    platform: PlatformName
}

export interface LiveObject {
    id: string
    room_id?: number
    title: string
    startTime: number
    endTime?: number
    channel_id: string | number
    channel?: ChannelObject
    thumbnail?: string
    status: LiveStatus
    viewers?: number
    peakViewers?: number
    group: string
    platform?: PlatformName
}

// Request-type params/args
export interface LiveObjectParams {
    channel_id?: string[],
    status?: LiveStatus[],
    groups?: string[],
    platforms?: PlatformName[],
    sort_by?: string
    sort_order?: SortOrder
}

export interface ChannelObjectParams {
    id?: string[],
    groups?: string[],
    platforms?: PlatformName[],
    sort_by?: string
    sort_order?: SortOrder
}
