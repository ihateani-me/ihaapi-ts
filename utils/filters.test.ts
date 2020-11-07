import * as Filters from "./filters";
import { sortObjectsByKey } from "./swissknife";

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

const EXAMPLE_YTCH_DATA = {
    "UCOgONfZgrG2g0jntQKa6cDw": {
        "id": "UCOgONfZgrG2g0jntQKa6cDw",
        "name": "Akane Channel / 灰原あかね 【あにまーれ】",
        "description": "【有閑喫茶 あにまーれ】\n\nそれは日本（北区赤羽）のどこかにある\nゲームや雑談などを楽しみながら美味しい珈琲が飲める喫茶店。\nそこには親しみのある動物のような女の子たちが楽しそうに働いている。\n\n一見コスプレ喫茶と見間違われるお店だが...\nその正体は異世界と繋がっていて...\n働いている女の子たちは人間ではない...？\n\n☆灰原あかねTwitter☆\nhttps://twitter.com/Akane_Haibara\n\n☆あにまーれのメンバー☆\n因幡はねる// https://www.youtube.com/channel/UC0Owc36U9lOyi9Gx9Ic-4qg\n宗谷いちか// https://www.youtube.com/channel/UC2kyQhzGOB-JPgcQX9OMgEw\n日ノ隈らん// https://www.youtube.com/channel/UCRvpMpzAXBRKJQuk-8-Sdvg\n風見くく// https://www.youtube.com/channel/UCXp7sNC0F_qkjickvlYkg-Q\n柚原いづみ// https://www.youtube.com/channel/UCW8WKciBixmaqaGqrlTITRQ\n白宮みみ// https://www.youtube.com/channel/UCtzCQnCT9E4o6U3mHHSHbQQ\n羽柴なつみ// https://www.youtube.com/channel/UC_BlXOQe5OcRC7o0GX8kp8A\n\n☆あにまーれ公式Twitter☆\nhttps://twitter.com/AniMare_cafe\n☆公式ホームページ☆\nhttps://www.774.ai/\n☆公式グッズ販売ページ☆\nhttps://774shouten.booth.pm/",
        "publishedAt": "2020-04-17T05:08:49.364147Z",
        "thumbnail": "https://yt3.ggpht.com/a/AATXAJzY6RBPqELOkRjBxjFuRUlvUg6BGKwhJl5DYs6G=s800-c-k-c0x00ffffff-no-rj",
        "group": "animare",
        "subscriberCount": 13300,
        "viewCount": 0,
        "videoCount": 0,
        "platform": "youtube"
    },
    "UCK4t1P3Aqqe6NDyRS92Opcg": {
        "id": "UCK4t1P3Aqqe6NDyRS92Opcg",
        "name": "Alia Adelia Ch.",
        "description": "Selamat pagi, selamat siang, selamat sore, selamat malam. Alia Adelia di sini. 😌\nAku suka bikin video ga jelas, tapi dengan tujuan yg jelas, yaitu menghibur kalian, ehe~\nSemoga kamu bisa senyum liat video-videoku!😤\n-----\nおはようございます！アリア・アデリアと申します。😌\nみんなが楽しめる動画を作りたいです！ 日本語で話す動画もちょこちょこ作ってます。\nよければチラ見でもしてください！よろしくお願いいたします！😤\n------------------------------------------------------------------------------------\n\n🐐 Sosmed Official 🐐\n- Instagram : https://www.instagram.com/aliaadelia.v/\n- Twitter : https://twitter.com/aliaadelia_v\n- Facebook : https://www.facebook.com/aliaadelia.v\n------------------------------------------------------------------------------------\n\n🐐 Email (for business) 🐐\n- mahapancaofficial+alia@gmail.com\n------------------------------------------------------------------------------------\n\n🐐 Hashtag 🐐\n- General : #aliaadelia\n- Untuk fanart : #aliaadelia_art\n- Fanname & mark : #kambengrebahan 🐐🛏️\n------------------------------------------------------------------------------------",
        "publishedAt": "2020-02-14T19:41:21Z",
        "thumbnail": "https://yt3.ggpht.com/a/AATXAJxT38CNIz5TGueep7JGQ0oX9NUmcy2r9RR2Iurr=s800-c-k-c0xffffffff-no-rj-mo",
        "group": "mahapanca",
        "subscriberCount": 150000,
        "viewCount": 6977151,
        "videoCount": 101,
        "platform": "youtube"
    },
    "UC9QnAjC7mT4ggHuedr1_kqQ": {
        "id": "UC9QnAjC7mT4ggHuedr1_kqQ",
        "name": "Andi Adinata Channel",
        "description": "Hello, nice to meet you! I'm Andi Adinata, a virtual youtuber from Indonesia.\n\n■ Twitter\nhttps://twitter.com/andiadinata_id\n\n■ Instagram\nhttps://www.instagram.com/andiadinata.id\n\n■ Facebook\nhttps://bit.ly/2pFPAw9\n\n■ Other E-mail\nvrandiadinata@gmail.com\n\n■ Business E-mail\nmahapancaofficial+andi@gmail.com\n\n--------------------------------------------------------------------------\n\nFAQ\n\n1. Boleh pakai lagu/coverannya di video saya gak?\n\n- Silakan asal cantumkan kreditnya ya!\n\n2. Boleh pakai liriknya untuk cover gak?\n\n- Boleh., cantumkan kredit juga ya!\n\n3. Boleh bikin video pendek/cuplikan livestreamnya ga?\n\n- Boleh dong!\n\n4. Boleh react videonya gak?\n\n- Boleh banget! Kalian bisa kasih tau kita via FB, IG, atau twitter biar nanti bisa kita liat.",
        "publishedAt": "2019-10-22T04:52:41.134427Z",
        "thumbnail": "https://yt3.ggpht.com/a/AATXAJwN9Kr12u_rI39Cp6YrBA0U0P3N2U_KNU2q6t2H=s800-c-k-c0x00ffffff-no-rj",
        "group": "mahapanca",
        "subscriberCount": 333000,
        "viewCount": 24949081,
        "videoCount": 168,
        "platform": "youtube"
    }
}

const EXPECTED_YTCH_MAIN_DATA = [
    {
        "id": "UCOgONfZgrG2g0jntQKa6cDw",
        "name": "Akane Channel / 灰原あかね 【あにまーれ】",
        "description": "【有閑喫茶 あにまーれ】\n\nそれは日本（北区赤羽）のどこかにある\nゲームや雑談などを楽しみながら美味しい珈琲が飲める喫茶店。\nそこには親しみのある動物のような女の子たちが楽しそうに働いている。\n\n一見コスプレ喫茶と見間違われるお店だが...\nその正体は異世界と繋がっていて...\n働いている女の子たちは人間ではない...？\n\n☆灰原あかねTwitter☆\nhttps://twitter.com/Akane_Haibara\n\n☆あにまーれのメンバー☆\n因幡はねる// https://www.youtube.com/channel/UC0Owc36U9lOyi9Gx9Ic-4qg\n宗谷いちか// https://www.youtube.com/channel/UC2kyQhzGOB-JPgcQX9OMgEw\n日ノ隈らん// https://www.youtube.com/channel/UCRvpMpzAXBRKJQuk-8-Sdvg\n風見くく// https://www.youtube.com/channel/UCXp7sNC0F_qkjickvlYkg-Q\n柚原いづみ// https://www.youtube.com/channel/UCW8WKciBixmaqaGqrlTITRQ\n白宮みみ// https://www.youtube.com/channel/UCtzCQnCT9E4o6U3mHHSHbQQ\n羽柴なつみ// https://www.youtube.com/channel/UC_BlXOQe5OcRC7o0GX8kp8A\n\n☆あにまーれ公式Twitter☆\nhttps://twitter.com/AniMare_cafe\n☆公式ホームページ☆\nhttps://www.774.ai/\n☆公式グッズ販売ページ☆\nhttps://774shouten.booth.pm/",
        "publishedAt": 1587100129,
        "thumbnail": "https://yt3.ggpht.com/a/AATXAJzY6RBPqELOkRjBxjFuRUlvUg6BGKwhJl5DYs6G=s800-c-k-c0x00ffffff-no-rj",
        "group": "animare",
        "subscriberCount": 13300,
        "viewCount": 0,
        "videoCount": 0,
        "platform": "youtube"
    },
    {
        "id": "UCK4t1P3Aqqe6NDyRS92Opcg",
        "name": "Alia Adelia Ch.",
        "description": "Selamat pagi, selamat siang, selamat sore, selamat malam. Alia Adelia di sini. 😌\nAku suka bikin video ga jelas, tapi dengan tujuan yg jelas, yaitu menghibur kalian, ehe~\nSemoga kamu bisa senyum liat video-videoku!😤\n-----\nおはようございます！アリア・アデリアと申します。😌\nみんなが楽しめる動画を作りたいです！ 日本語で話す動画もちょこちょこ作ってます。\nよければチラ見でもしてください！よろしくお願いいたします！😤\n------------------------------------------------------------------------------------\n\n🐐 Sosmed Official 🐐\n- Instagram : https://www.instagram.com/aliaadelia.v/\n- Twitter : https://twitter.com/aliaadelia_v\n- Facebook : https://www.facebook.com/aliaadelia.v\n------------------------------------------------------------------------------------\n\n🐐 Email (for business) 🐐\n- mahapancaofficial+alia@gmail.com\n------------------------------------------------------------------------------------\n\n🐐 Hashtag 🐐\n- General : #aliaadelia\n- Untuk fanart : #aliaadelia_art\n- Fanname & mark : #kambengrebahan 🐐🛏️\n------------------------------------------------------------------------------------",
        "publishedAt": 1581709281,
        "thumbnail": "https://yt3.ggpht.com/a/AATXAJxT38CNIz5TGueep7JGQ0oX9NUmcy2r9RR2Iurr=s800-c-k-c0xffffffff-no-rj-mo",
        "group": "mahapanca",
        "subscriberCount": 150000,
        "viewCount": 6977151,
        "videoCount": 101,
        "platform": "youtube"
    },
    {
        "id": "UC9QnAjC7mT4ggHuedr1_kqQ",
        "name": "Andi Adinata Channel",
        "description": "Hello, nice to meet you! I'm Andi Adinata, a virtual youtuber from Indonesia.\n\n■ Twitter\nhttps://twitter.com/andiadinata_id\n\n■ Instagram\nhttps://www.instagram.com/andiadinata.id\n\n■ Facebook\nhttps://bit.ly/2pFPAw9\n\n■ Other E-mail\nvrandiadinata@gmail.com\n\n■ Business E-mail\nmahapancaofficial+andi@gmail.com\n\n--------------------------------------------------------------------------\n\nFAQ\n\n1. Boleh pakai lagu/coverannya di video saya gak?\n\n- Silakan asal cantumkan kreditnya ya!\n\n2. Boleh pakai liriknya untuk cover gak?\n\n- Boleh., cantumkan kredit juga ya!\n\n3. Boleh bikin video pendek/cuplikan livestreamnya ga?\n\n- Boleh dong!\n\n4. Boleh react videonya gak?\n\n- Boleh banget! Kalian bisa kasih tau kita via FB, IG, atau twitter biar nanti bisa kita liat.",
        "publishedAt": 1571719961,
        "thumbnail": "https://yt3.ggpht.com/a/AATXAJwN9Kr12u_rI39Cp6YrBA0U0P3N2U_KNU2q6t2H=s800-c-k-c0x00ffffff-no-rj",
        "group": "mahapanca",
        "subscriberCount": 333000,
        "viewCount": 24949081,
        "videoCount": 168,
        "platform": "youtube"
    }
]

const EXAMPLE_TWCASTCH_DATA = {
    "KaguraMea_VoV": {
        "id": "KaguraMea_VoV",
        "name": "🍥神楽めあ/KaguraMea🍥",
        "description": "お仕事の連絡先: KaguraMea.info@gmail.com\nオタクの用事はこちらへ:kaguramea.box@gmail.com",
        "followerCount": 10149,
        "level": 45,
        "thumbnail": "https://imagegw02.twitcasting.tv/image3s/pbs.twimg.com/profile_images/1228197140767240194/QsgwGxKr_bigger.jpg",
        "platform": "twitcasting"
    },
    "natsuiromatsuri": {
        "id": "natsuiromatsuri",
        "name": "夏色まつり🏮NatsuiroMatsuri",
        "description": "君に出逢えたことが活動を始めた理由なのかも。ファンアートは #祭絵 R18は #まつりは絵っち 使用する場合があります。世界一大好きなパパ(担当絵師)：@halllki 日常アカウント→(@7216_2nd )将来の夢は声優です。",
        "followerCount": 16302,
        "level": 42,
        "thumbnail": "https://imagegw02.twitcasting.tv/image3s/pbs.twimg.com/profile_images/1290740013521461248/y2NhEZS1_bigger.jpg",
        "platform": "twitcasting"
    }
}

const EXPECTED_TWCASTCH_MAIN_DATA = [
    {
        "id": "KaguraMea_VoV",
        "name": "🍥神楽めあ/KaguraMea🍥",
        "description": "お仕事の連絡先: KaguraMea.info@gmail.com\nオタクの用事はこちらへ:kaguramea.box@gmail.com",
        "followerCount": 10149,
        "level": 45,
        "thumbnail": "https://imagegw02.twitcasting.tv/image3s/pbs.twimg.com/profile_images/1228197140767240194/QsgwGxKr_bigger.jpg",
        "platform": "twitcasting"
    },
    {
        "id": "natsuiromatsuri",
        "name": "夏色まつり🏮NatsuiroMatsuri",
        "description": "君に出逢えたことが活動を始めた理由なのかも。ファンアートは #祭絵 R18は #まつりは絵っち 使用する場合があります。世界一大好きなパパ(担当絵師)：@halllki 日常アカウント→(@7216_2nd )将来の夢は声優です。",
        "followerCount": 16302,
        "level": 42,
        "thumbnail": "https://imagegw02.twitcasting.tv/image3s/pbs.twimg.com/profile_images/1290740013521461248/y2NhEZS1_bigger.jpg",
        "platform": "twitcasting"
    }
]

const EXAMPLE_BILICH_DATA = [
    {
        "id": "389056211",
        "room_id": "21267062",
        "name": "AZKi_Official",
        "description": "",
        "thumbnail": "http://i0.hdslb.com/bfs/face/d9c777fb0246ee88ee083ff9ae428ed0f4f8c158.jpg",
        "subscriberCount": 69591,
        "viewCount": 0,
        "videoCount": 0,
        "live": false,
        "platform": "bilibili"
    },
    {
        "id": "286179206",
        "room_id": "8899503",
        "name": "时乃空Official",
        "description": "      ",
        "thumbnail": "http://i1.hdslb.com/bfs/face/dbe787cb37a78587aa6f282cdafdc37a73348495.jpg",
        "subscriberCount": 249592,
        "viewCount": 0,
        "videoCount": 0,
        "live": false,
        "platform": "bilibili"
    }
]

// Test BiliBili UUID check
describe("Filter BiliBili data with uuid from URL params", () => {
    test("`?uuid=` format passed by user.", () => {
        expect(Filters.bilibili_use_uuids(null, EXAMPLE_BILIDATA)).toEqual(EXAMPLE_BILIDATA);
    });
    test("Single uuid passed. (ex: 427061218)", () => {
        expect(Filters.bilibili_use_uuids("427061218", EXAMPLE_BILIDATA)).toEqual([EXAMPLE_BILIDATA[0]]);
    });
    test("Multiple uuid passed. (ex: 427061218,511613156)", () => {
        expect(Filters.bilibili_use_uuids("427061218,511613156", EXAMPLE_BILIDATA)).toEqual([EXAMPLE_BILIDATA[0], EXAMPLE_BILIDATA[3]]);
        expect(Filters.bilibili_use_uuids("427061218%2C511613156", EXAMPLE_BILIDATA)).toEqual([EXAMPLE_BILIDATA[0], EXAMPLE_BILIDATA[3]]);
    });
});

// Test group check
describe("Get Group dataset", () => {
    test("Unknown data passed.", () => {
        expect(Filters.get_group(null)).toBeNull();
    });
    test("Data passed, but it's not on list.", () => {
        expect(Filters.get_group("unknown_group")).toBeNull();
    });
    test("Data passed, and it's on list.", () => {
        expect(Filters.get_group("nijisanji")).not.toBeNull();
    });
});

// Test YouTube live check.
describe("Filter YouTube Live data by Query Argument", () => {
    test("No args passed by user.", () => {
        // @ts-ignore
        expect(Filters.parse_youtube_live_args({}, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_YTDB_ONE);
    });
    test("Status passed by user. (Only `live`)", () => {
        let EXPECTED_RESULTS = {
            live: EXPECTED_YTDB_ONE["live"]
        }
        // @ts-ignore
        expect(Filters.parse_youtube_live_args({ status: "live" }, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_RESULTS);
    });
    test("Status passed by user. (`live` and `past`)", () => {
        let EXPECTED_RESULTS = {
            live: EXPECTED_YTDB_ONE["live"]
        }
        // @ts-ignore
        expect(Filters.parse_youtube_live_args({ status: "live,past" }, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_RESULTS);
        // @ts-ignore
        expect(Filters.parse_youtube_live_args({ status: "live%2Cpast" }, EXAMPLE_YTDB_DATA)).toEqual(EXPECTED_RESULTS);
    });
    test("Fields passed by user. (single opts. `id`)", () => {
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
    test("Fields passed by user. (multiple opts. `id,title,startTime`)", () => {
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
    test("Groups passed by user. (single opts `honeystrap`)", () => {
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
    test("Groups passed by user. (single opts `honeystrap,dotlive`)", () => {
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
    test("All data passed (fields: `id,group`, groups: `honeystrap,dotlive`, status: `live,upcoming`", () => {
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
    test("All data passed with unknown params (fields: `id,group`, groups: `honeystrap,dotlive`, status: `live,upcoming`", () => {
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
});

describe("Filter channels data by Query Arguments", () => {
    test("No args passed by user.", () => {
        // @ts-ignore
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTCH_DATA));
        expect(Filters.channel_filters({}, deep_copy)).toEqual({"channels": EXPECTED_YTCH_MAIN_DATA, "cached": true});
    });

    test("Unknown args passed by user.", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTCH_DATA));
        // @ts-ignore
        expect(Filters.channel_filters({"test": "id,name"}, deep_copy)).toEqual({"channels": EXPECTED_YTCH_MAIN_DATA, "cached": true});
    });

    it("Passed not Array or Object", () => {
        // @ts-ignore
        expect(Filters.channel_filters({}, "a string")).toStrictEqual("a string");
    })

    it("Passed bilibili channels which is a Array not object.", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_BILICH_DATA));
        let expect_deep_copy = JSON.parse(JSON.stringify(EXAMPLE_BILICH_DATA));
        // @ts-ignore
        expect(Filters.channel_filters({}, deep_copy)).toEqual({"channels": expect_deep_copy, "cached": true});
    });

    test("Sort key, but key doesn't exist.", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTCH_DATA));
        let expect_deep_copy = JSON.parse(JSON.stringify(EXPECTED_YTCH_MAIN_DATA));
        expect_deep_copy = sortObjectsByKey(EXPECTED_YTCH_MAIN_DATA, "viewsCount"); // typo for viewCount
        // @ts-ignore
        expect(Filters.channel_filters({"sort": "viewsCount"}, deep_copy)).toEqual({"channels": expect_deep_copy, "cached": true});
    });

    test("Sort key, but using disallowed key. (`live`)", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTCH_DATA));
        let expect_deep_copy = JSON.parse(JSON.stringify(EXPECTED_YTCH_MAIN_DATA));
        expect_deep_copy = sortObjectsByKey(EXPECTED_YTCH_MAIN_DATA, "name");
        // @ts-ignore
        expect(Filters.channel_filters({"sort": "live"}, deep_copy)).toEqual({"channels": expect_deep_copy, "cached": true});
    });

    test("Sort key, by publishedAt.", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTCH_DATA));
        let expect_deep_copy = JSON.parse(JSON.stringify(EXPECTED_YTCH_MAIN_DATA));
        expect_deep_copy = sortObjectsByKey(EXPECTED_YTCH_MAIN_DATA, "publishedAt");
        // @ts-ignore
        expect(Filters.channel_filters({"sort": "publishedAt"}, deep_copy)).toEqual({"channels": expect_deep_copy, "cached": true});
    });

    test("Sort key, by publishedAt and descending order", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTCH_DATA));
        let expect_deep_copy = JSON.parse(JSON.stringify(EXPECTED_YTCH_MAIN_DATA));
        expect_deep_copy = sortObjectsByKey(EXPECTED_YTCH_MAIN_DATA, "publishedAt");
        // @ts-ignore
        expect(Filters.channel_filters({"sort": "publishedAt", "order": "descending"}, deep_copy)).toEqual({"channels": expect_deep_copy.reverse(), "cached": true});
    })

    test("Filter groups but group doesn't exist", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTCH_DATA));
        let expect_deep_copy = JSON.parse(JSON.stringify(EXPECTED_YTCH_MAIN_DATA));
        expect(Filters.channel_filters({"group": "unknown"}, deep_copy)).toEqual({"channels": [], "cached": true});
    })

    test("Filter groups, using animare", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_YTCH_DATA));
        let expect_deep_copy = JSON.parse(JSON.stringify(EXPECTED_YTCH_MAIN_DATA))[0];
        expect(Filters.channel_filters({"group": "animare"}, deep_copy)).toEqual({"channels": [expect_deep_copy], "cached": true});
    })

    test("Fields filtering, fields doesn't exist.", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_TWCASTCH_DATA));
        // let expect_deep_copy = JSON.parse(JSON.stringify(EXPECTED_TWCASTCH_MAIN_DATA));
        expect(Filters.channel_filters({"fields": "unknown"}, deep_copy)).toEqual({"channels": [{},{}], "cached": true});
    })

    test("Fields filtering, only one field", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_TWCASTCH_DATA));
        let expect_deep_copy = JSON.parse(JSON.stringify(EXPECTED_TWCASTCH_MAIN_DATA));
        let new_expect = [];
        expect_deep_copy.forEach((val) => {
            new_expect.push({"id": val.id});
        })
        expect(Filters.channel_filters({"fields": "id"}, deep_copy)).toEqual({"channels": new_expect, "cached": true});
    })

    test("Fields filtering, multiple fields", () => {
        let deep_copy = JSON.parse(JSON.stringify(EXAMPLE_TWCASTCH_DATA));
        let expect_deep_copy = JSON.parse(JSON.stringify(EXPECTED_TWCASTCH_MAIN_DATA));
        let new_expect = [];
        expect_deep_copy.forEach((val) => {
            new_expect.push({"id": val.id, "name": val.name});
        })
        expect(Filters.channel_filters({"fields": "id,name"}, deep_copy)).toEqual({"channels": new_expect, "cached": true});
    })
})
