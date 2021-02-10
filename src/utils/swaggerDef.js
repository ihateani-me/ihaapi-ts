/* eslint-disable max-len */
const packageJson = require("../../package.json");
const API_DESCRIPTIONS = `Source Code: [ihateani-me/ihaapi-ts](https://github.com/ihateani-me/ihaapi-ts)

A maybe-pretty-fast API endpoint made mainly for VTuber stuff.<br>

The current API are written in TypeScript and was ported from Python.<br>
Using MongoDB as it's Backend Database and Express as the Web Backend.<br>
Everything is still being ported, v1 will be when it's finalized.

It's expanded so much that I don't bother hosting it on another domain.<br>
Most of the API are hidden but you can contact me more via Email or Discord to get more info.

**Discord: N4O#8868**<br>
Please don't just add me, after you add me start messaging me so I'll know.
`;

const VTAPI_INFORMATION = `A VTubers **API endpoint** for the new [BiliBili scheduling system](https://live.bilibili.com/p/html/live-web-calendar).<br>
And also include API endpoint for YouTube streams, Twitcasting and Twitch Streams.<br>
Including Channel Stats.

**DEPRECATION NOTICE** <br>
The v1 API are going to be deprecated, it's already marked as deprecated in here,<br>
but the real deprecation date will be on **31st January 2021**.<br>
Please start using the VTuber API v2 GraphQL here: [/v2/graphql](/v2/graphql)

This API are updating automatically via Python appscheduler (Running on another server.):<br>
\\- **Every 1 minute** for YouTube/Twitch/Twitcasting Live Streams data.<br>
\\- **Every 2 minutes** for YouTube Upcoming Streams data.<br>
\\- **Every 2 minutes** for BiliBili Live Streams data.<br>
\\- **Every 4 minutes** for BiliBili Upcoming Streams data.<br>
\\- **Every 6 hours** for Channels Info/Stats.<br>

You could contact me at **Discord: _N4O#8868_**<br>
If you need more Other VTubers to add to the list.<br>
After you add me, please Send Message directly so I'll know.
`;

const OTHERAPI_INFORMATION = `This API are already available before migration to JS, but it was hidden from Public.<br>
It mainly consists of **Games API** that include HowLongToBeat and Steam, **Sauce Finder API** that use SauceNAO, IQDB, and ASCII2D as available backend,<br>
**nHentai API** that also include an Image proxier to bypass government block, and finally an **U2 API** that fetch torrents from a website called U2 DMHY (Mainly Japanese Anime torrents)

**DEPRECATION NOTICE** <br>
Sauce API will be deprecated in favor of GraphQL version of it.<br>
Date of deprecation: **31st January 2021**<br>
Please start using GraphQL v2 API here: [/v2/graphql](/v2/graphql)

The API for this are experimental and subject to change, there's already some changes between this and the original one.<br>
I'm still planning to add more stuff, but that's for later day.<br>
If you have more suggestion what I should add, you could contact me at **Discord: _N4O#8868_**<br>
After you add me, please Send Message directly so I'll know.
`;

const MAIN_MODELS_SCHEMAS = {
    BiliScheduleModel: {
        description: "The Model Representing the BiliBili Live Schedule Endpoint.",
        type: "object",
        required: ["id", "room_id", "title", "startTime", "channel", "channel_name", "platform"],
        properties: {
            id: {
                type: "string",
                description: "An ID that consist of subscriptions_id and program_id with `bili` prefixes.",
                example: "bili1234_9876",
            },
            room_id: {
                type: "integer",
                description: "BiliBili Live Room ID the streamer will use.",
                example: 12345678,
            },
            title: {
                type: "string",
                description: "The room/live title.",
            },
            startTime: {
                type: "integer",
                description: "Scheduled/Real stream start time in UTC.",
            },
            channel: {
                type: "string",
                description: "BiliBili Channel/Space/User ID.",
            },
            channel_name: {
                type: "string",
                description: "BiliBili Channel/Space/User name.",
            },
            thumbnail: {
                type: "string",
                description: "Thumbnail of the stream.",
            },
            viewers: {
                type: "integer",
                description: "Peak viewers for this stream.",
            },
            platform: {
                type: "string",
                description: "The platform the stream running currently.",
                example: "bilibili",
            },
        },
    },
    YouTubeScheduleModel: {
        description: "The Model Representing the YouTube Live Schedule Endpoint.",
        type: "object",
        required: ["id", "title", "startTime", "channel", "status", "thumbnail", "group", "platform"],
        properties: {
            id: {
                type: "string",
                description: "A youtube video ID",
            },
            title: {
                type: "string",
                description: "The stream title.",
            },
            startTime: {
                type: "integer",
                description: "Scheduled/Real stream start time in UTC.",
            },
            endTime: {
                type: "integer",
                description: "The stream end time in UTC.",
            },
            channel: {
                type: "string",
                description: "YouTube Channel ID.",
            },
            status: {
                type: "string",
                description: "Status of streams",
                enum: ["live", "upcoming", "past"],
            },
            thumbnail: {
                type: "string",
                description: "Thumbnail of the stream.",
            },
            viewers: {
                type: "integer",
                description: "Current viewers for the stream.",
            },
            group: {
                type: "string",
                description: "The VTubers group.",
            },
            platform: {
                type: "string",
                description: "The platform the stream running currently.",
                example: "youtube",
            },
        },
    },
    TwitcastingScheduleModel: {
        description: "The Model Representing the Twitcasting Live Schedule Endpoint.",
        type: "object",
        required: ["id", "title", "startTime", "channel", "viewers", "peakViewers", "platform"],
        properties: {
            id: {
                type: "string",
                description: "A twitcasting stream ID",
            },
            title: {
                type: "string",
                description: "The stream title.",
            },
            startTime: {
                type: "integer",
                description: "Scheduled/Real stream start time in UTC.",
            },
            channel: {
                type: "string",
                description: "Twitcaster Channel ID.",
            },
            viewers: {
                type: "integer",
                description: "Current viewers for the stream.",
            },
            peakViewers: {
                type: "integer",
                description: "Peak viewers for the stream.",
            },
            platform: {
                type: "string",
                description: "The platform the stream running currently.",
                example: "twitcasting",
            },
        },
    },
    TwitchScheduleModel: {
        description: "The Model Representing the Twitch Live Schedule Endpoint.",
        type: "object",
        required: ["id", "title", "startTime", "channel", "channel_id", "thumbnail", "platform"],
        properties: {
            id: {
                type: "string",
                description: "A twitch stream ID",
            },
            title: {
                type: "string",
                description: "The stream title.",
            },
            startTime: {
                type: "integer",
                description: "Scheduled/Real stream start time in UTC.",
            },
            channel: {
                type: "string",
                description: "Twitch channel login name or username.",
            },
            channel_id: {
                type: "string",
                description: "Twitch channel user ID.",
            },
            thumbnail: {
                type: "string",
                description: "The thumbnail of ths stream.",
            },
            platform: {
                type: "string",
                description: "The platform the stream running currently.",
                example: "twitch",
            },
        },
    },
    BiliBiliChannelModel: {
        description: "The Model Representing the BiliBili Channel Endpoint.",
        type: "object",
        required: [
            "id",
            "room_id",
            "name",
            "description",
            "thumbnail",
            "publishedAt",
            "subscriberCount",
            "viewCount",
            "videoCount",
            "live",
            "platform",
        ],
        properties: {
            id: {
                type: "string",
                description: "An User/Channel/Space BiliBili ID.",
            },
            room_id: {
                type: "string",
                description: "BiliBili Live Room ID the streamer will use.",
            },
            name: {
                type: "string",
                description: "BiliBili Channel/Space/User name.",
            },
            description: {
                type: "string",
                description: "The Channel Signature/Description.",
            },
            thumbnail: {
                type: "string",
                description: "The Channel profile picture.",
            },
            subscriberCount: {
                type: "integer",
                description: "The channels subscription/followers count.",
            },
            viewCount: {
                type: "integer",
                description: "The channels views count.",
            },
            videoCount: {
                type: "integer",
                description: "The channels published/uploaded videos count.",
            },
            live: {
                type: "boolean",
                description: "Is the channel currently live or not.",
            },
            platform: {
                type: "string",
                description: "The platform the stream running currently.",
                example: "bilibili",
            },
        },
    },
    YouTubeChannelModel: {
        description: "The Model Representing the YouTube Channel Endpoint.",
        type: "object",
        required: [
            "id",
            "name",
            "description",
            "thumbnail",
            "publishedAt",
            "subscriberCount",
            "viewCount",
            "videoCount",
            "group",
            "platform",
        ],
        properties: {
            id: {
                type: "string",
                description: "The YouTube channel ID.",
            },
            name: {
                type: "string",
                description: "The channel name.",
            },
            description: {
                type: "string",
                description: "The channel description.",
            },
            thumbnail: {
                type: "string",
                description: "The Channel profile picture.",
            },
            publishedAt: {
                type: "integer",
                description: "The channel publication time in UTC.",
            },
            subscriberCount: {
                type: "integer",
                description: "The channels subscription/followers count.",
            },
            viewCount: {
                type: "integer",
                description: "The channels views count.",
            },
            videoCount: {
                type: "integer",
                description: "The channels published/uploaded videos count.",
            },
            group: {
                type: "string",
                description: "The livers group.",
            },
            platform: {
                type: "string",
                description: "The platform the stream running currently.",
                example: "youtube",
            },
        },
    },
    TwitcastingChannelModel: {
        description: "The Model Representing the Twitcasting Channel Endpoint.",
        type: "object",
        required: ["id", "name", "description", "thumbnail", "followerCount", "level", "platform"],
        properties: {
            id: {
                type: "string",
                description: "Twitch username.",
            },
            name: {
                type: "string",
                description: "The channel name.",
            },
            description: {
                type: "string",
                description: "The channel description.",
            },
            thumbnail: {
                type: "string",
                description: "The Channel profile picture.",
            },
            followerCount: {
                type: "integer",
                description: "The channels subscription/followers count.",
            },
            level: {
                type: "integer",
                description: "The channels level.",
            },
            platform: {
                type: "string",
                description: "The platform the stream running currently.",
                example: "twitcasting",
            },
        },
    },
    TwitchChannelModel: {
        description: "The Model Representing the Twitch Channel Endpoint.",
        type: "object",
        required: [
            "id",
            "user_id",
            "name",
            "description",
            "thumbnail",
            "followerCount",
            "viewCount",
            "platform",
        ],
        properties: {
            id: {
                type: "string",
                description: "Twitch username.",
            },
            user_id: {
                type: "string",
                description: "Twitch user id.",
            },
            name: {
                type: "string",
                description: "The channel name.",
            },
            description: {
                type: "string",
                description: "The channel description.",
            },
            thumbnail: {
                type: "string",
                description: "The Channel profile picture.",
            },
            followerCount: {
                type: "integer",
                description: "The channels subscription/followers count.",
            },
            viewCount: {
                type: "integer",
                description: "The channels views count.",
            },
            platform: {
                type: "string",
                description: "The platform the stream running currently.",
                example: "twitch",
            },
        },
    },
    SauceFinderResultModel: {
        description: "A possible match for image sauce.",
        type: "object",
        required: ["title", "confidence", "thumbnail", "indexer"],
        properties: {
            title: {
                type: "string",
                description: "The result image title.",
            },
            source: {
                type: "string",
                description: "The result source if available.",
            },
            confidence: {
                type: "number",
                description: "The result match confidence.",
            },
            thumbnail: {
                type: "string",
                description: "The image thumbnail (temporary)",
            },
            extra_info: {
                type: "object",
                description: "Extra info dict, might be available to some of them.",
                properties: {},
            },
            indexer: {
                type: "string",
                description: "The result indexer",
            },
        },
    },
};

module.exports = {
    openapi: "3.0.0",
    info: {
        version: packageJson["version"],
        title: "ihateani.me API [ihaAPI]",
        description: API_DESCRIPTIONS,
        contact: {
            name: "Contact",
            email: "noaione0809@gmail.com",
            url: "https://github.com/ihateani-me/ihaapi-ts",
        },
        license: {
            name: "MIT License",
            url: "https://github.com/ihateani-me/ihaapi-ts/blob/master/LICENSE",
        },
        "x-logo": {
            url: "https://p.n4o.xyz/i/ihaTranslucent.png",
            altText: "ihaAPI Logo",
        },
    },
    servers: [
        {
            url: "https://api.ihateani.me",
        },
    ],
    tags: [
        { name: "Hololive", description: "Hololive BiliBili Endpoint" },
        { name: "Nijisanji", description: "Nijisanji BiliBili & YouTube Endpoint" },
        { name: "Others", description: "Others VTubers BiliBili & YouTube Endpoint" },
        { name: "Twitcasting", description: "Twitcasting Stream Endpoint" },
        { name: "Twitch", description: "Twitch Stream Endpoint" },
        {
            name: "games_api",
            "x-displayName": "Games API",
            description: "An API wrapper anything related to games.",
        },
        {
            name: "sauce_api",
            "x-displayName": "Sauce Finder API [DEPRECATION]",
            description: "An API wrapper for SauceNAO, IQDB, and ASCII2D. [ON IT'S WAY TO DEPRECATION]",
        },
        {
            name: "nh_nsfw",
            "x-displayName": "nH [NSFW]",
            description: "An API wrapper for nH (you know what it is).",
        },
        { name: "u2_api", "x-displayName": "U2 API", description: "An API wrapper for U2 RSS and Offers." },
        {
            name: "bilischedule_model",
            "x-displayName": "BiliBili Live Schedule",
            description: `<SchemaDefinition schemaRef="#/components/schemas/BiliScheduleModel" />`,
        },
        {
            name: "bilichannel_model",
            "x-displayName": "BiliBili Channel",
            description: `<SchemaDefinition schemaRef="#/components/schemas/BiliBiliChannelModel" />`,
        },
        {
            name: "youtubeschedule_model",
            "x-displayName": "YouTube Live Schedule",
            description: `<SchemaDefinition schemaRef="#/components/schemas/YouTubeScheduleModel" />`,
        },
        {
            name: "youtubechannel_model",
            "x-displayName": "YouTube Channel",
            description: `<SchemaDefinition schemaRef="#/components/schemas/YouTubeChannelModel" />`,
        },
        {
            name: "twitchlive_model",
            "x-displayName": "Twitch Live Schedule",
            description: `<SchemaDefinition schemaRef="#/components/schemas/TwitchScheduleModel" />`,
        },
        {
            name: "twitchchannel_model",
            "x-displayName": "Twitch Channel",
            description: `<SchemaDefinition schemaRef="#/components/schemas/TwitchChannelModel" />`,
        },
        {
            name: "twitcastlive_model",
            "x-displayName": "Twitcasting Live Schedule",
            description: `<SchemaDefinition schemaRef="#/components/schemas/TwitcastingScheduleModel" />`,
        },
        {
            name: "twitcastchannel_model",
            "x-displayName": "Twitcasting Channel",
            description: `<SchemaDefinition schemaRef="#/components/schemas/TwitcastingChannelModel" />`,
        },
        {
            name: "saucefinder_model",
            "x-displayName": "Sauce Result Model",
            description: `<SchemaDefinition schemaRef="#/components/schemas/SauceFinderResultModel" />`,
        },
        { name: "vtapi_info", description: VTAPI_INFORMATION, "x-displayName": "Information" },
        { name: "otherapi_info", description: OTHERAPI_INFORMATION, "x-displayName": "Information" },
    ],
    "x-tagGroups": [
        {
            name: "VTuber API",
            tags: ["vtapi_info", "Hololive", "Nijisanji", "Others", "Twitcasting", "Twitch"],
        },
        {
            name: "Others API",
            tags: ["otherapi_info", "games_api", "sauce_api", "nh_nsfw", "u2_api"],
        },
        {
            name: "Models",
            tags: [
                "bilischedule_model",
                "bilichannel_model",
                "youtubeschedule_model",
                "youtubechannel_model",
                "twitcastlive_model",
                "twitcastchannel_model",
                "twitchlive_model",
                "twitchchannel_model",
                "saucefinder_model",
            ],
        },
    ],
    // "components": {
    //     schemas: MAIN_MODELS_SCHEMAS
    // },
    components: {
        schemas: MAIN_MODELS_SCHEMAS,
    },
};
