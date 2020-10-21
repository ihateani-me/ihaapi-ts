const API_DESCRIPTIONS = `A VTubers **API endpoint** for
the new [BiliBili scheduling system](https://live.bilibili.com/p/html/live-web-calendar).

You could contact me at **Discord**: _N4O#8868_
If you need more Other VTubers to add to the list.

This API are updating automatically via Python appscheduler:
\- **Every 1 minute** for YouTube/Twitch/Twitcasting Live Streams data.
\- **Every 2 minutes** for YouTube Upcoming Streams data.
\- **Every 2 minutes** for BiliBili Live Streams data.
\- **Every 4 minutes** for BiliBili Upcoming Streams data.
\- **Every 6 hours** for Channels Info/Stats.
`;

module.exports = {
    info: {
        version: "0.9.1",
        title: "VTubers BiliBili Schedule API",
        description: API_DESCRIPTIONS,
        contact: {
            email: "noaione0809@gmail.com"
        },
        license: {
            "name": "MIT License",
            "url": "https://github.com/noaione/vtb-schedule/blob/master/LICENSE"
        }
    },
    host: "api.ihateani.me",
    basePath: "/",
    schemes: ["https"],
    tags: [
        {"name": "Hololive"},
        {"name": "Nijisanji"},
        {"name": "Others"},
        {"name": "Twitcasting"},
        {"name": "Twitch"}
    ],
    definitions: {
        "BiliScheduleModel": {
            type: "object",
            required: ["id", "room_id", "title", "startTime", "channel", "channel_name", "platform"],
            properties: {
                id: {
                    type: "string",
                    description: "An ID that consist of subscriptions_id and program_id with `bili` prefixes.",
                    example: "bili1234_9876"
                },
                room_id: {
                    type: "integer",
                    description: "BiliBili Live Room ID the streamer will use.",
                    example: 12345678
                },
                title: {
                    type: "string",
                    description: "The room/live title."
                },
                startTime: {
                    type: "integer",
                    description: "Scheduled/Real stream start time in UTC."
                },
                channel: {
                    type: "string",
                    description: "BiliBili Channel/Space/User ID."
                },
                channel_name: {
                    type: "string",
                    description: "BiliBili Channel/Space/User name."
                },
                thumbnail: {
                    type: "string",
                    description: "Thumbnail of the stream."
                },
                viewers: {
                    type: "integer",
                    description: "Peak viewers for this stream."
                },
                platform: {
                    type: "string",
                    description: "The platform the stream running currently.",
                    example: "bilibili"
                }
            }
        },
        "YouTubeScheduleModel": {
            type: "object",
            required: ["id", "title", "startTime", "channel", "status", "thumbnail", "group", "platform"],
            properties: {
                id: {
                    type: "string",
                    description: "A youtube video ID"
                },
                title: {
                    type: "string",
                    description: "The stream title."
                },
                startTime: {
                    type: "integer",
                    description: "Scheduled/Real stream start time in UTC."
                },
                endTime: {
                    type: "integer",
                    description: "The stream end time in UTC."
                },
                channel: {
                    type: "string",
                    description: "YouTube Channel ID."
                },
                status: {
                    type: "string",
                    description: "Status of streams",
                    choices: ["live", "upcoming", "past"]
                },
                thumbnail: {
                    type: "string",
                    description: "Thumbnail of the stream."
                },
                viewers: {
                    type: "integer",
                    description: "Current viewers for the stream."
                },
                group: {
                    type: "string",
                    description: "The VTubers group."
                },
                platform: {
                    type: "string",
                    description: "The platform the stream running currently.",
                    example: "youtube"
                }
            }
        },
        "BiliBiliChannelModel": {
            "type": "object",
            "required": [],
            properties: {
                id: {
                    type: "string",
                    description: "An User/Channel/Space BiliBili ID."
                },
                room_id: {
                    type: "string",
                    description: "BiliBili Live Room ID the streamer will use."
                },
                name: {
                    type: "string",
                    description: "BiliBili Channel/Space/User name."
                },
                description: {
                    type: "string",
                    description: "The Channel Signature/Description."
                },
                thumbnail: {
                    type: "string",
                    description: "The Channel profile picture."
                },
                subscriberCount: {
                    type: "integer",
                    description: "The channels subscription/followers count."
                },
                viewCount: {
                    type: "integer",
                    description: "The channels views count."
                },
                videoCount: {
                    type: "integer",
                    description: "The channels published/uploaded videos count."
                },
                live: {
                    type: "boolean",
                    description: "Is the channel currently live or not.",
                },
                platform: {
                    type: "string",
                    description: "The platform the stream running currently.",
                    example: "bilibili"
                }
            }
        },
        "YouTubeChannelModel": {
            "type": "object",
            "required": [],
            properties: {
                id: {
                    type: "string",
                    description: "The YouTube channel ID."
                },
                name: {
                    type: "string",
                    description: "The channel name."
                },
                description: {
                    type: "string",
                    description: "The channel description."
                },
                thumbnail: {
                    type: "string",
                    description: "The Channel profile picture."
                },
                publishedAt: {
                    type: "integer",
                    description: "The channel publication time in UTC."  
                },
                subscriberCount: {
                    type: "integer",
                    description: "The channels subscription/followers count."
                },
                viewCount: {
                    type: "integer",
                    description: "The channels views count."
                },
                videoCount: {
                    type: "integer",
                    description: "The channels published/uploaded videos count."
                },
                group: {
                    type: "string",
                    description: "The livers group.",
                },
                platform: {
                    type: "string",
                    description: "The platform the stream running currently.",
                    example: "youtube"
                }
            }
        }
    }
}