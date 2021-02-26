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
            "The channel ID to be checked, this will limit result to provided channel ID"
            channel_id: [ID]
            "The groups to be checked, this will limit result to VTuber from the group"
            groups: [String]
            "The platform that will be checked, will limit to the selected platforms"
            platforms: [PlatformName]
            """
            Sort key to be used, use the key name of the result to select it, use dot notation.
            (Note: not all of key are supported)
            """
            sort_by: String = "timeData.startTime"
            "Sort order"
            sort_order: SortOrder = asc
            "Pagination cursor of next page"
            cursor: String
            "Limit per page, maximum limit is 75"
            limit: Int = 25
        ): LivesResource
        "Get upcoming live"
        upcoming(
            "The channel ID to be checked, this will limit result to provided channel ID"
            channel_id: [ID]
            "The groups to be checked, this will limit result to VTuber from the group"
            groups: [String]
            "The platform that will be checked, will limit to the selected platforms"
            platforms: [PlatformName]
            """
            Sort key to be used, use the key name of the result to select it, use dot notation.
            (Note: not all of key are supported)
            """
            sort_by: String = "timeData.startTime"
            "Sort order"
            sort_order: SortOrder = asc
            "The maximum time that will be returned, Unix Timestamp or UTC format (in seconds)"
            max_scheduled_time: Int
            "Pagination cursor of next page"
            cursor: String
            "Limit per page, maximum limit is 75"
            limit: Int = 25
        ): LivesResource
        "Get past live of Youtube livestream up-to 24 hours (before deletion from database)"
        ended(
            "The channel ID to be checked, this will limit result to provided channel ID"
            channel_id: [ID]
            "The groups to be checked, this will limit result to VTuber from the group"
            groups: [String]
            "The platform that will be checked, will limit to the selected platforms"
            platforms: [PlatformName]
            """
            Sort key to be used, use the key name of the result to select it, use dot notation.
            (Note: not all of key are supported)
            """
            sort_by: String = "timeData.endTime"
            "Sort order"
            sort_order: SortOrder = asc
            "Pagination cursor of next page"
            cursor: String
            "The maximum lookback past stream that will be returned, in hours (maximum is 24)"
            max_lookback: Int = 6
            "Limit per page, maximum limit is 75"
            limit: Int = 25
        ): LivesResource @cacheControl(maxAge: 300)
        "Get uploaded video to Youtube, Twitcasting, Twitch, etc."
        videos(
            "The channel ID to be checked, this will limit result to provided channel ID"
            channel_id: [ID]
            "The groups to be checked, this will limit result to VTuber from the group"
            groups: [String]
            "The platform that will be checked, will limit to the selected platforms"
            platforms: [PlatformName]
            """
            Sort key to be used, use the key name of the result to select it, use dot notation.
            (Note: not all of key are supported)
            """
            sort_by: String = "publishedAt"
            "Sort order"
            sort_order: SortOrder = asc
            "Pagination cursor of next page"
            cursor: String
            "Limit per page, maximum limit is 75"
            limit: Int = 25
        ): LivesResource @cacheControl(maxAge: 1800)
        "Get a list of channel information including statistics"
        channels(
            "The channel ID to be checked, this will limit result to provided channel ID"
            id: [ID]
            "The groups to be checked, this will limit result to VTuber from the group"
            groups: [String]
            "The platform that will be checked, will limit to the selected platforms"
            platforms: [PlatformName]
            """
            Sort key to be used, use the key name of the result to select it, use dot notation.
            (Note: not all of key are supported)
            """
            sort_by: String = "id"
            "Sort order"
            sort_order: SortOrder = asc
            "Pagination cursor of next page"
            cursor: String
            "Limit per page, maximum limit is 75"
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
        saucenao(
            "Image URL to find the sauce for"
            url: String!
            "Minimum similarity for the image"
            minsim: Float = 57.5
            "Maximum image that will be returned"
            limit: Int = 6
            "DB Index to be used, recommended to leave untoched"
            db_index: Int = 999
        ): SauceResource!
        "Find your sauce via IQDB"
        iqdb(
            "Image URL to find the sauce for"
            url: String!
            "Minimum similarity for the image"
            minsim: Float = 50.0
            "Maximum image that will be returned"
            limit: Int = 6
        ): SauceResource!
        "Find your sauce via ASCII2D"
        ascii2d(
            "Image URL to find the sauce for"
            url: String!
            "Maximum image that will be returned"
            limit: Int = 2
        ): SauceResource!
    }

    """
    Query through nHentai API with easy to use wrapper.
    This is a drop in replacement for /v1/nh, except the Image route.
    """
    type nHentaiQuery {
        "Get information of a doujin_id"
        info("The doujin ID to see" doujin_id: ID!): nhInfoResult!
        "Search nHentai for some doujin(shi)"
        search(
            "Query params, support advanced params too!"
            query: String!
            "The page you want to see"
            page: Int = 1
        ): nhSearchResult!
        "Get latest nHentai doujin(shi)"
        latest("The page you want to see" page: Int = 1): nhSearchResult!
    }

    """
    Query through a collection of Image Board/Booru website.
    """
    type ImageBoardQuery {
        "Search the Image board with the tags params for your search query."
        search(
            "The tags that will be searched, limit of 2 for now"
            tags: [String]
            "The page you want to see"
            page: Int = 1
            "The engine/backend to use"
            engine: [BoardEngine!]! = [danbooru, konachan, gelbooru]
        ): ImageBoardResults!
        "Search the Image board with the tags params for your search query, this will randomized the order."
        random(
            "The tags that will be searched, limit of 2 for now"
            tags: [String]
            "The page you want to see"
            page: Int = 1
            "The engine/backend to use"
            engine: [BoardEngine!]! = [danbooru, konachan, gelbooru]
        ): ImageBoardResults!
    }

    """
    ihateani.me API Query
    """
    type Query {
        "VTuber API Query"
        vtuber: VTuberQuery!
        "Sauce API Query"
        sauce: SauceQuery!
        "nHentai API Query"
        nhentai: nHentaiQuery!
        "Image Board Query"
        imagebooru: ImageBoardQuery!
    }
`;
