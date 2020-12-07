import { gql } from "apollo-server-express";

export * from "./vtapi";
export * from "./saucefinder";

export const v2Definitions = gql`

    """
    Query through our VTuber API Database, including live, upcoming, and past live streams.
    You could check what's avaiable by querying the channels().
    This endpoint have VTuber from Youtube, BiliBili, Twitch, and Twitcasting.
    """
    type VTuberQuery {
        "Get currently live VTuber"
        live(
            channel_id: [ID],
            groups: [String],
            platforms: [PlatformName],
            sort_by: String = "startTime"
            sort_order: SortOrder = asc
            cursor: String
            limit: Int = 25
        ): LivesResource
        "Get upcoming live"
        upcoming(
            channel_id: [ID],
            groups: [String],
            platforms: [PlatformName],
            sort_by: String = "startTime"
            sort_order: SortOrder = asc
            cursor: String
            limit: Int = 25
        ): LivesResource
        "Get past live of Youtube livestream up-to 24 hours (before deletion from database)"
        ended(
            channel_id: [ID],
            groups: [String],
            platforms: [PlatformName],
            sort_by: String = "endTime"
            sort_order: SortOrder = asc
            cursor: String
            max_lookback: Int = 6
            limit: Int = 25
        ): LivesResource @cacheControl(maxAge: 300)
        "Get a list of channel information including statistics"
        channels(
            id: [ID],
            groups: [String],
            platforms: [PlatformName],
            sort_by: String = "id"
            sort_order: SortOrder = asc
            cursor: String
            limit: Int = 25
        ): ChannelsResource @cacheControl(maxAge: 1800)
    }

    """
    Query through our Sauce Finder API, with support from SauceNAO, IQDB, and ASCII2D.
    This is a drop-in replacement for the old API at: /v1/sauce
    """
    type SauceQuery {
        "Find your sauce via SauceNAO"
        saucenao(
            url: String!
            minsim: Float = 57.5
            limit: Int = 6
            db_index: Int = 999
        ): SauceResource!
        "Find your sauce via IQDB"
        iqdb(
            url: String!
            minsim: Float = 50.0
            limit: Int = 6
        ): SauceResource!
        "Find your sauce via ASCII2D"
        ascii2d(
            url: String!
            limit: Int = 2
        ): SauceResource!
    }

    type Query {
        vtuber: VTuberQuery!
        sauce: SauceQuery!
    }
`;