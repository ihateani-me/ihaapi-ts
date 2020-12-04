import { ApolloServer, gql } from "apollo-server-express";
import { RedisCache } from "apollo-server-cache-redis";
import { VTAPIv2 } from "./schemas";

import { VTAPIv2Resolvers } from "./resolvers";
import { is_none } from "../utils/swissknife";
import { NijiTubeDB, VTubersDB } from "../dbconn";
import { BiliBili } from "./datasources/bilibili";
import { YoutubeChannel, YoutubeLive } from "./datasources/youtube";
import { TwitcastingLive, TwitcastingChannel } from "./datasources/twitcasting";
import { TwitchLive, TwitchChannel } from "./datasources/twitch";

const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT);
// if (is_none(REDIS_PASSWORD)) {
//     var cacheServers = new RedisCache({
//         host: is_none(REDIS_HOST) ? "127.0.0.1" : REDIS_HOST,
//         port: isNaN(REDIS_PORT) ? 6379 : REDIS_PORT
//     })
// } else {
//     var cacheServers = new RedisCache({
//         host: is_none(REDIS_HOST) ? "127.0.0.1" : REDIS_HOST,
//         port: isNaN(REDIS_PORT) ? 6379 : REDIS_PORT,
//         password: REDIS_PASSWORD,
//     })
// }

const server = new ApolloServer({
    typeDefs: VTAPIv2,
    resolvers: VTAPIv2Resolvers,
    // cache: cacheServers,
    // tracing: true,
    dataSources: () => ({
        holobili: new BiliBili(VTubersDB.db.collection("hololive_data")),
        nijibili: new BiliBili(VTubersDB.db.collection("nijisanji_data")),
        otherbili: new BiliBili(VTubersDB.db.collection("otherbili_data")),
        youtubeLive: new YoutubeLive(VTubersDB.db.collection("yt_other_livedata")),
        youtubeChannels: new YoutubeChannel(VTubersDB.db.collection("yt_other_channels")),
        nijitubeLive: new YoutubeLive(NijiTubeDB.db.collection("nijitube_live")),
        nijitubeChannels: new YoutubeChannel(NijiTubeDB.db.collection("nijitube_channels")),
        twitchLive: new TwitchLive(VTubersDB.db.collection("twitch_data")),
        twitchChannels: new TwitchChannel(VTubersDB.db.collection("twitch_channels")),
        twitcastingLive: new TwitcastingLive(VTubersDB.db.collection("twitcasting_data")),
        twitcastingChannels: new TwitcastingChannel(VTubersDB.db.collection("twitcasting_channels")),
    })
})

export default server;