import * as Filters from "./filters";

const EXAMPLE_BILIDATA = [
    {
        "id": "bili21618129_1603232375",
        "room_id": 21618129,
        "title": "摄影会",
        "startTime": 1603232375,
        "channel": "427061218",
        "channel_name": "夜霧Yogiri",
        "thumbnail": "https://i0.hdslb.com/bfs/live/new_room_cover/0ecf3466ee0e8b24a65ab2886504e2d4a32d5a5b.jpg",
        "viewers": 77845,
        "platform": "bilibili"
    },
    {
        "id": "bili11184_6983",
        "room_id": 21618138,
        "title": "直播",
        "startTime": 1603281600,
        "channel": "354411419",
        "channel_name": "希薇娅Civia",
        "platform": "bilibili"
    },
    {
        "id": "bili11185_6984",
        "room_id": 21618138,
        "title": "和朵朵快乐杂谈",
        "startTime": 1603366200,
        "channel": "354411419",
        "channel_name": "希薇娅Civia",
        "platform": "bilibili"
    },
    {
        "id": "bili10929_6977",
        "room_id": 21908209,
        "title": "朵 桃 夜 媂 恐鬼症",
        "startTime": 1603429200,
        "channel": "511613156",
        "channel_name": "朵莉丝Doris",
        "platform": "bilibili"
    }
]
const EXAMPLE_YTDB_DATA = {
    "UCIcAj6WkJ8vZ7DeJVgmeqKw": [
        {
            "id": "2Z91l-PZgCs",
            "title": "【APEX】ソロでこそこそ練習するゾ【 IBG/胡桃のあ 】",
            "status": "past",
            "startTime": 1603256489,
            "endTime": 1603263778,
            "group": "irisbg",
            "thumbnail": "https://i.ytimg.com/vi/2Z91l-PZgCs/maxresdefault.jpg",
            "platform": "youtube"
        }
    ],
    "UC5LyYg6cCA4yHEYvtUsir3g": [
        {
            "id": "yvBIic9kWmM",
            "title": "【APEX】CR Cupれんしう Ver.2【LVG / 一ノ瀬うるは】",
            "status": "live",
            "startTime": 1603263712,
            "endTime": null,
            "group": "lupinusvg",
            "thumbnail": "https://i.ytimg.com/vi/yvBIic9kWmM/maxresdefault.jpg",
            "platform": "youtube",
            "viewers": 1054
        }
    ],
    "UCMxxFFeuhFQ30quuePTym0A": [
        {
            "id": "BUUSxHQxrQ4",
            "title": "I'm Back.. Ask Me Anything!",
            "status": "upcoming",
            "startTime": 1603281600,
            "endTime": null,
            "group": "solovtuber",
            "thumbnail": "https://i.ytimg.com/vi/BUUSxHQxrQ4/maxresdefault.jpg",
            "platform": "youtube"
        }
    ],
    "UCajhBT4nMrg3DLS-bLL2RCg": [],
    "UCl-3q6t6zdZwgIsFZELb7Zg": [
        {
            "id": "DNAdaTZErRQ",
            "title": "🤍【minecraft】お話しながら整地編5【白百合リリィ/ViViD所属】",
            "status": "upcoming",
            "startTime": 1603267200,
            "endTime": null,
            "group": "vivid",
            "thumbnail": "https://i.ytimg.com/vi/DNAdaTZErRQ/maxresdefault.jpg",
            "platform": "youtube"
        }
    ],
    "UC1519-d1jzGiL1MPTxEdtSA": [
        {
            "id": "3WzsNq57-V8",
            "title": "【APEX/エイペックス】ランクｏｒカジュアル【PS4版/ゲーム実況】八重沢なとり VTuber",
            "status": "live",
            "startTime": 1603259923,
            "endTime": null,
            "group": "dotlive",
            "thumbnail": "https://i.ytimg.com/vi/3WzsNq57-V8/maxresdefault.jpg",
            "platform": "youtube",
            "viewers": 1046
        }
    ],
    "UCeLzT-7b2PBcunJplmWtoDg": [
        {
            "id": "jOI3SjNwUaY",
            "title": "「ね〜え？」short ver. -IMAGINATION vol.3 収録-",
            "status": "upcoming",
            "startTime": 1603278000,
            "endTime": null,
            "group": "honeystrap",
            "thumbnail": "https://i.ytimg.com/vi/jOI3SjNwUaY/maxresdefault.jpg",
            "platform": "youtube"
        },
        {
            "id": "rvotzBQbW8c",
            "title": "【歌枠】可愛いお歌をいっぱい歌うよ！Singing【周防パトラ / ハニスト】",
            "status": "upcoming",
            "startTime": 1603371600,
            "endTime": null,
            "group": "honeystrap",
            "thumbnail": "https://i.ytimg.com/vi/rvotzBQbW8c/maxresdefault.jpg",
            "platform": "youtube"
        }
    ],
}

const EXPECTED_YTDB_ONE = {
    live: [
        {
            id: '3WzsNq57-V8',
            title: '【APEX/エイペックス】ランクｏｒカジュアル【PS4版/ゲーム実況】八重沢なとり VTuber',
            status: 'live',
            startTime: 1603259923,
            endTime: null,
            group: 'dotlive',
            thumbnail: 'https://i.ytimg.com/vi/3WzsNq57-V8/maxresdefault.jpg',
            platform: 'youtube',
            viewers: 1046,
            channel: 'UC1519-d1jzGiL1MPTxEdtSA'
        },
        {
            id: 'yvBIic9kWmM',
            title: '【APEX】CR Cupれんしう Ver.2【LVG / 一ノ瀬うるは】',
            status: 'live',
            startTime: 1603263712,
            endTime: null,
            group: 'lupinusvg',
            thumbnail: 'https://i.ytimg.com/vi/yvBIic9kWmM/maxresdefault.jpg',
            platform: 'youtube',
            viewers: 1054,
            channel: 'UC5LyYg6cCA4yHEYvtUsir3g'
        }
    ],
    upcoming: [
        {
            id: 'DNAdaTZErRQ',
            title: '🤍【minecraft】お話しながら整地編5【白百合リリィ/ViViD所属】',
            status: 'upcoming',
            startTime: 1603267200,
            endTime: null,
            group: 'vivid',
            thumbnail: 'https://i.ytimg.com/vi/DNAdaTZErRQ/maxresdefault.jpg',
            platform: 'youtube',
            channel: 'UCl-3q6t6zdZwgIsFZELb7Zg'
        },
        {
            id: 'jOI3SjNwUaY',
            title: '「ね〜え？」short ver. -IMAGINATION vol.3 収録-',
            status: 'upcoming',
            startTime: 1603278000,
            endTime: null,
            group: 'honeystrap',
            thumbnail: 'https://i.ytimg.com/vi/jOI3SjNwUaY/maxresdefault.jpg',
            platform: 'youtube',
            channel: 'UCeLzT-7b2PBcunJplmWtoDg'
        },
        {
            id: 'BUUSxHQxrQ4',
            title: "I'm Back.. Ask Me Anything!",
            status: 'upcoming',
            startTime: 1603281600,
            endTime: null,
            group: 'solovtuber',
            thumbnail: 'https://i.ytimg.com/vi/BUUSxHQxrQ4/maxresdefault.jpg',
            platform: 'youtube',
            channel: 'UCMxxFFeuhFQ30quuePTym0A'
        },
        {
            id: 'rvotzBQbW8c',
            title: '【歌枠】可愛いお歌をいっぱい歌うよ！Singing【周防パトラ / ハニスト】',
            status: 'upcoming',
            startTime: 1603371600,
            endTime: null,
            group: 'honeystrap',
            thumbnail: 'https://i.ytimg.com/vi/rvotzBQbW8c/maxresdefault.jpg',
            platform: 'youtube',
            channel: 'UCeLzT-7b2PBcunJplmWtoDg'
        }
    ],
    ended: [
        {
            id: '2Z91l-PZgCs',
            title: '【APEX】ソロでこそこそ練習するゾ【 IBG/胡桃のあ 】',
            status: 'past',
            startTime: 1603256489,
            endTime: 1603263778,
            group: 'irisbg',
            thumbnail: 'https://i.ytimg.com/vi/2Z91l-PZgCs/maxresdefault.jpg',
            platform: 'youtube',
            channel: 'UCIcAj6WkJ8vZ7DeJVgmeqKw'
        }
    ],
}

// Test BiliBili UUID check
test("[BiliBili UUIDs Check] `?uuid=` format passed by user.", () => {
    expect(Filters.bilibili_use_uuids(null, EXAMPLE_BILIDATA)).toEqual(EXAMPLE_BILIDATA);
});
test("[BiliBili UUIDs Check] Single uuid passed. (ex: 427061218)", () => {
    expect(Filters.bilibili_use_uuids("427061218", EXAMPLE_BILIDATA)).toEqual([EXAMPLE_BILIDATA[0]]);
});
test("[BiliBili UUIDs Check] Multiple uuid passed. (ex: 427061218,511613156)", () => {
    expect(Filters.bilibili_use_uuids("427061218,511613156", EXAMPLE_BILIDATA)).toEqual([EXAMPLE_BILIDATA[0], EXAMPLE_BILIDATA[3]]);
    expect(Filters.bilibili_use_uuids("427061218%2C511613156", EXAMPLE_BILIDATA)).toEqual([EXAMPLE_BILIDATA[0], EXAMPLE_BILIDATA[3]]);
});

// Test group check
test("[Group Check] Unknown data passed.", () => {
    expect(Filters.get_group(null)).toBeNull();
})
test("[Group Check] Data passed, but it's not on list.", () => {
    expect(Filters.get_group("unknown_group")).toBeNull();
})
test("[Group Check] Data passed, and it's on list.", () => {
    expect(Filters.get_group("nijisanji")).not.toBeNull();
})
// Data sort
test("[Data Sort] Undefined data passed.", () => {
    // @ts-ignore
    expect(Filters.sortLive(undefined, "id")).toEqual([]);
})
test("[Data Sort] Empty data passed.", () => {
    expect(Filters.sortLive([], "id")).toEqual([]);
})
test("[Data Sort] Data passed, but only one passed.", () => {
    // @ts-ignore
    expect(Filters.sortLive([{id: "555555"}], "data")).toEqual([{id: "555555"}]);
})
test("[Data Sort] Data passed, but key doesn't exist.", () => {
    // @ts-ignore
    expect(Filters.sortLive([{id: "555555"}, {"id": "44444"}], "data")).toEqual([{id: "555555"}, {"id": "44444"}]);
})
test("[Data Sort] Data passed, and key exist.", () => {
    // @ts-ignore
    expect(Filters.sortLive([{id: "555555"}, {"id": "44444"}], "id")).toEqual([{id: "44444"}, {"id": "555555"}]);
})

// Test YouTube live check.
test("[YouTube Live Parsing] No args passed by user.", () => {
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({}, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_YTDB_ONE);
});
test("[YouTube Live Parsing] Status passed by user. (Only `live`)", () => {
    let EXPECTED_RESULTS = {
        live: EXPECTED_YTDB_ONE["live"]
    }
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ status: "live" }, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_RESULTS);
});
test("[YouTube Live Parsing] Status passed by user. (`live` and `past`)", () => {
    let EXPECTED_RESULTS = {
        live: EXPECTED_YTDB_ONE["live"]
    }
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ status: "live,past" }, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_RESULTS);
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ status: "live%2Cpast" }, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_RESULTS);
});
test("[YouTube Live Parsing] Fields passed by user. (single opts. `id`)", () => {
    let EXPECTED_RESULTS = {
        "ended": [
            { "id": "2Z91l-PZgCs" }
        ],
        "live": [
            { "id": "yvBIic9kWmM" },
            { "id": "3WzsNq57-V8" }
        ],
        "upcoming": [
            { "id": "BUUSxHQxrQ4" },
            { "id": "DNAdaTZErRQ" },
            { "id": "jOI3SjNwUaY" },
            { "id": "rvotzBQbW8c" }
        ]
    };
    // deep copy because reason.
    let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTDB_DATA));
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ fields: "id" }, deep_copy)).toEqual(EXPECTED_RESULTS);
});
test("[YouTube Live Parsing] Fields passed by user. (multiple opts. `id,title,startTime`)", () => {
    let EXPECTED_RESULTS = {
        live: [
            {
                id: '3WzsNq57-V8',
                title: '【APEX/エイペックス】ランクｏｒカジュアル【PS4版/ゲーム実況】八重沢なとり VTuber',
                startTime: 1603259923
            },
            {
                id: 'yvBIic9kWmM',
                title: '【APEX】CR Cupれんしう Ver.2【LVG / 一ノ瀬うるは】',
                startTime: 1603263712
            }
        ],
        upcoming: [
            {
                id: 'DNAdaTZErRQ',
                title: '🤍【minecraft】お話しながら整地編5【白百合リリィ/ViViD所属】',
                startTime: 1603267200
            },
            {
                id: 'jOI3SjNwUaY',
                title: '「ね〜え？」short ver. -IMAGINATION vol.3 収録-',
                startTime: 1603278000
            },
            {
                id: 'BUUSxHQxrQ4',
                title: "I'm Back.. Ask Me Anything!",
                startTime: 1603281600
            },
            {
                id: 'rvotzBQbW8c',
                title: '【歌枠】可愛いお歌をいっぱい歌うよ！Singing【周防パトラ / ハニスト】',
                startTime: 1603371600
            }
        ],
        ended: [
            {
                id: '2Z91l-PZgCs',
                title: '【APEX】ソロでこそこそ練習するゾ【 IBG/胡桃のあ 】',
                startTime: 1603256489
            }
        ]
    }
    // deep copy because reason.
    let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTDB_DATA));
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ fields: "id,title,startTime" }, deep_copy)).toEqual(EXPECTED_RESULTS);
    deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTDB_DATA));
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ fields: "id%2Ctitle%2CstartTime" }, deep_copy)).toEqual(EXPECTED_RESULTS);
});
test("[YouTube Live Parsing] Groups passed by user. (single opts `honeystrap`)", () => {
    let EXPECTED_RESULTS = {
        live: [],
        upcoming: [
            {
                id: 'jOI3SjNwUaY',
                title: '「ね〜え？」short ver. -IMAGINATION vol.3 収録-',
                status: 'upcoming',
                startTime: 1603278000,
                endTime: null,
                group: 'honeystrap',
                thumbnail: 'https://i.ytimg.com/vi/jOI3SjNwUaY/maxresdefault.jpg',
                platform: 'youtube',
                channel: 'UCeLzT-7b2PBcunJplmWtoDg'
            },
            {
                id: 'rvotzBQbW8c',
                title: '【歌枠】可愛いお歌をいっぱい歌うよ！Singing【周防パトラ / ハニスト】',
                status: 'upcoming',
                startTime: 1603371600,
                endTime: null,
                group: 'honeystrap',
                thumbnail: 'https://i.ytimg.com/vi/rvotzBQbW8c/maxresdefault.jpg',
                platform: 'youtube',
                channel: 'UCeLzT-7b2PBcunJplmWtoDg'
            }
        ],
        ended: []
    }
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ group: "honeystrap" }, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_RESULTS);
})
test("[YouTube Live Parsing] Groups passed by user. (single opts `honeystrap,dotlive`)", () => {
    let EXPECTED_RESULTS = {
        live: [
            {
                id: '3WzsNq57-V8',
                title: '【APEX/エイペックス】ランクｏｒカジュアル【PS4版/ゲーム実況】八重沢なとり VTuber',
                status: 'live',
                startTime: 1603259923,
                endTime: null,
                group: 'dotlive',
                thumbnail: 'https://i.ytimg.com/vi/3WzsNq57-V8/maxresdefault.jpg',
                platform: 'youtube',
                viewers: 1046,
                channel: 'UC1519-d1jzGiL1MPTxEdtSA'
            }
        ],
        upcoming: [
            {
                id: 'jOI3SjNwUaY',
                title: '「ね〜え？」short ver. -IMAGINATION vol.3 収録-',
                status: 'upcoming',
                startTime: 1603278000,
                endTime: null,
                group: 'honeystrap',
                thumbnail: 'https://i.ytimg.com/vi/jOI3SjNwUaY/maxresdefault.jpg',
                platform: 'youtube',
                channel: 'UCeLzT-7b2PBcunJplmWtoDg'
            },
            {
                id: 'rvotzBQbW8c',
                title: '【歌枠】可愛いお歌をいっぱい歌うよ！Singing【周防パトラ / ハニスト】',
                status: 'upcoming',
                startTime: 1603371600,
                endTime: null,
                group: 'honeystrap',
                thumbnail: 'https://i.ytimg.com/vi/rvotzBQbW8c/maxresdefault.jpg',
                platform: 'youtube',
                channel: 'UCeLzT-7b2PBcunJplmWtoDg'
            }
        ],
        ended: []
    }
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ group: "honeystrap,dotlive" }, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_RESULTS);
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ group: "honeystrap%2Cdotlive" }, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_RESULTS);
});
test("[YouTube Live Parsing] All data passed (fields: `id,group`, groups: `honeystrap,dotlive`, status: `live,upcoming`", () => {
    let EXPECTED_RESULTS = {
        live: [
            {
                id: '3WzsNq57-V8',
                group: 'dotlive',
            }
        ],
        upcoming: [
            {
                id: 'jOI3SjNwUaY',
                group: 'honeystrap',
            },
            {
                id: 'rvotzBQbW8c',
                group: 'honeystrap',
            }
        ]
    }
    // deep copy because reason.
    let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTDB_DATA));
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ status: "live,upcoming", fields: "id,group", group: "honeystrap,dotlive" }, deep_copy)).toEqual(EXPECTED_RESULTS);
    deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTDB_DATA));
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ status: "live%2Cupcoming", fields: "id%2Cgroup", group: "honeystrap%2Cdotlive" }, deep_copy)).toEqual(EXPECTED_RESULTS);
});
test("[YouTube Live Parsing] All data passed with unknown params (fields: `id,group`, groups: `honeystrap,dotlive`, status: `live,upcoming`", () => {
    let EXPECTED_RESULTS = {
        live: [
            {
                id: '3WzsNq57-V8',
                group: 'dotlive',
            }
        ],
        upcoming: [
            {
                id: 'jOI3SjNwUaY',
                group: 'honeystrap',
            },
            {
                id: 'rvotzBQbW8c',
                group: 'honeystrap',
            }
        ]
    }
    // deep copy because reason.
    let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTDB_DATA));
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ status: "live,upcoming", fields: "id,group", group: "honeystrap,dotlive", field: "typo" }, deep_copy)).toEqual(EXPECTED_RESULTS);
    deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTDB_DATA));
    // @ts-ignore
    expect(Filters.parse_youtube_live_args({ status: "live%2Cupcoming", fields: "id%2Cgroup", group: "honeystrap%2Cdotlive", field: "typo" }, deep_copy)).toEqual(EXPECTED_RESULTS);
});