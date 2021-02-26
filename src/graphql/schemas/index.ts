import { gql } from "apollo-server-express";

export * from "./vtapi";
export * from "./saucefinder";
export * from "./nh";
export * from "./imagebooru";

export const v2Definitions = gql`
    """
    Query through our VTuber API Database, including live, upcoming, and past live streams.
    You could check what's avaiable by querying the channels().
    This endpoint have VTuber from Youtube, BiliBili, Twitch, and Twitcasting.
    """
    type VTuberQuery {
        "Get currently live VTuber"
        live(
            channel_id: [ID]
            groups: [String]
            platforms: [PlatformName]
            sort_by: String = "timeData.startTime"
            sort_order: SortOrder = asc
            cursor: String
            limit: Int = 25
        ): LivesResource
        "Get upcoming live"
        upcoming(
            channel_id: [ID]
            groups: [String]
            platforms: [PlatformName]
            sort_by: String = "timeData.startTime"
            sort_order: SortOrder = asc
            max_scheduled_time: Int
            cursor: String
            limit: Int = 25
        ): LivesResource
        "Get past live of Youtube livestream up-to 24 hours (before deletion from database)"
        ended(
            channel_id: [ID]
            groups: [String]
            platforms: [PlatformName]
            sort_by: String = "timeData.endTime"
            sort_order: SortOrder = asc
            cursor: String
            max_lookback: Int = 6
            limit: Int = 25
        ): LivesResource @cacheControl(maxAge: 300)
        "Get uploaded video to Youtube, Twitcasting, Twitch, etc."
        videos(
            channel_id: [ID]
            groups: [String]
            platforms: [PlatformName]
            sort_by: String = "publishedAt"
            sort_order: SortOrder = asc
            cursor: String
            limit: Int = 25
        ): LivesResource @cacheControl(maxAge: 1800)
        "Get a list of channel information including statistics"
        channels(
            id: [ID]
            groups: [String]
            platforms: [PlatformName]
            sort_by: String = "id"
            sort_order: SortOrder = asc
            cursor: String
            limit: Int = 25
        ): ChannelsResource @cacheControl(maxAge: 1800)
        "Get a list of available groups in the database"
        groups: GroupsResource @cacheControl(maxAge: 300)
    }

    """
    Query through our Sauce Finder API, with support from SauceNAO, IQDB, and ASCII2D.
    This is a drop-in replacement for the old API at: /v1/sauce
    """
    type SauceQuery {
        "Find your sauce via SauceNAO"
        saucenao(url: String!, minsim: Float = 57.5, limit: Int = 6, db_index: Int = 999): SauceResource!
        "Find your sauce via IQDB"
        iqdb(url: String!, minsim: Float = 50.0, limit: Int = 6): SauceResource!
        "Find your sauce via ASCII2D"
        ascii2d(url: String!, limit: Int = 2): SauceResource!
    }

    """
    Query through nHentai API with easy to use wrapper.
    This is a drop in replacement for /v1/nh, except the Image route.
    """
    type nHentaiQuery {
        info(doujin_id: ID!): nhInfoResult!
        search(query: String!, page: Int = 1): nhSearchResult!
        latest(page: Int = 1): nhSearchResult!
    }

    type ImageBoardQuery {
        search(tags: [String], engine: [BoardEngine!]! = [danbooru]): ImageBoardResults!
        random(tags: [String], engine: [BoardEngine!]! = [danbooru]): ImageBoardResults!
    }

    type Query {
        vtuber: VTuberQuery!
        sauce: SauceQuery!
        nhentai: nHentaiQuery!
        imagebooru: ImageBoardQuery!
    }
`;
