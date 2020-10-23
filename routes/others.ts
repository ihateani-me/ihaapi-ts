import * as express from "express";
import { VTubersDB } from "../dbconn";
import { parse_youtube_live_args, bilibili_use_uuids, channel_filters } from "../utils/filters";
import { LiveMap, BilibiliData, YTLiveArray, YouTubeData, BiliBiliChannel, ChannelMap, ChannelArray, YouTubeChannel } from "../utils/models";
const othersroutes = express.Router()

othersroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

/**
 * @swagger
 * /other/upcoming:
 *  get:
 *      summary: Get Others VTuber BiliBili Upcoming Schedule
 *      description: Fetch a list of upcoming streams from BiliBili for Other VTubers, updated every 4 minutes.
 *      tags:
 *      - Others
 *      produces:
 *      - application/json
 *      parameters:
 *      - in: query
 *        name: uids
 *        description: Filter upcoming results with User ID (support multiple id separated by comma)
 *        required: false
 *        type: string
 *      responses:
 *          '200':
 *              description: A list of upcoming streams
 *              schema:
 *                  type: object
 *                  properties:
 *                      upcoming:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/BiliScheduleModel'
 *                      cached:
 *                          type: boolean
 */
othersroutes.get("/upcoming", (req, res) => {
    let user_query = req.query;
    res.header({
        "Cache-Control": "public, max-age=60, immutable"
    });
    try {
        console.log("[OthersBili] Fetching Database...");
        VTubersDB.open_collection("otherbili_data")
            .then(data_docs => {
                console.log("[OthersBili] Parsing Database...");
                let vtb_res: LiveMap<BilibiliData[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                let final_mappings: LiveMap<BilibiliData[]> = {};
                console.log("[OthersBili] Filtering Database...");
                // @ts-ignore
                final_mappings["upcoming"] = bilibili_use_uuids(user_query.uuid, vtb_res["upcoming"]);
                final_mappings["cached"] = true;
                console.log("[OthersBili] Sending...");
                res.json(final_mappings)
            })
            .catch(error => {
                console.log(error);
                res.status(500).json({message: "Internal server error occured."});
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal server error occured."});
    }
});


/**
 * @swagger
 * /other/channels:
 *  get:
 *      summary: Get Other VTubers BiliBili Channel Info/Stats
 *      description: Fetch a list of Others VTubers BiliBili channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Others
 *      produces:
 *      - application/json
 *      parameters:
 *      - in: query
 *        name: fields
 *        description: Filter fields that will be returned, multiples value are separated by comma
 *        required: false
 *        type: string
 *        enum:
 *        - id
 *        - room_id
 *        - name
 *        - description
 *        - thumbnail
 *        - subscriberCount
 *        - viewCount
 *        - videoCount
 *        - live
 *      - in: query
 *        name: sort
 *        description: Sort data by one of the values available.
 *        required: false
 *        type: string
 *        enum:
 *        - id
 *        - room_id
 *        - name
 *        - description
 *        - thumbnail
 *        - subscriberCount
 *        - viewCount
 *        - videoCount
 *      - in: query
 *        name: order
 *        description: Sort order.
 *        required: false
 *        type: string
 *        enum:
 *        - ascending
 *        - descending
 *      responses:
 *          '200':
 *              description: A list of channels.
 *              schema:
 *                  type: object
 *                  properties:
 *                      channels:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/BiliBiliChannelModel'
 *                      cached:
 *                          type: boolean
 */
othersroutes.get("/channels", (req, res) => {
    let user_query = req.query;
    try {
        console.log("[OtherBili_Channels] Fetching Database...");
        VTubersDB.open_collection("otherbili_data")
            .then(data_docs => {
                console.log("[OtherBili_Channels] Parsing Database...");
                let vtb_res: ChannelMap<BiliBiliChannel[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                console.log("[OtherBili_Channels] Filtering Database...");
                let final_mappings = channel_filters(user_query, vtb_res["channels"]);
                console.log("[OtherBili_Channels] Sending...");
                res.json(final_mappings)
            })
            .catch(error => {
                console.log(error);
                res.status(500).json({message: "Internal server error occured."});
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal server error occured."});
    }
});


/**
 * @swagger
 * /other/youtube/live:
 *  get:
 *      summary: Get Other VTubers YouTube Live Schedule
 *      description: |
 *          Fetch a list of live/upcoming streams from YouTube for Other VTubers, updated every 1 minute for live data and 2 minutes for upcoming data.
 *       
 *          The results can be filtered by using Query parameters
 *          The query params can handle multiple values, separate them by using comma (,)
 *          For example: `/other/youtube/live?group=voms,others,honeystrap`
 * 
 *          Wrong parameters value will just be ignored and not gonna return error.
 *      tags:
 *      - Others
 *      produces:
 *      - application/json
 *      parameters:
 *      - in: query
 *        name: status
 *        description: Filter status (live/upcoming/ended) that will be returned, multiples value are separated by comma
 *        required: false
 *        type: string
 *        enum:
 *        - live
 *        - upcoming
 *        - ended
 *      - in: query
 *        name: group
 *        description: Filter groups that will be returned, multiples value are separated by comma
 *        required: false
 *        type: string
 *        enum:
 *        - vtuberesports
 *        - lupinusvg
 *        - irisblackgames
 *        - cattleyareginagames
 *        - nanashi
 *        - animare
 *        - vapart
 *        - honeystrap
 *        - sugarlyric
 *        - mahapanca
 *        - vivid
 *        - noripro
 *        - hanayori
 *        - voms
 *        - others
 *      - in: query
 *        name: fields
 *        description: Filter fields that will be returned, multiples value are separated by comma
 *        required: false
 *        type: string
 *        enum:
 *        - id
 *        - title
 *        - startTime
 *        - endTime
 *        - status
 *        - thumbnail
 *        - viewers
 *        - channel
 *      responses:
 *          '200':
 *              description: A list of live/upcoming/ended streams
 *              schema:
 *                  type: object
 *                  properties:
 *                      live:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/YouTubeScheduleModel'
 *                      upcoming:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/YouTubeScheduleModel'
 *                      ended:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/YouTubeScheduleModel'
 *                      cached:
 *                          type: boolean
 */
othersroutes.get("/youtube/live", (req, res) => {
    let user_query = req.query;
    try {
        console.log("[OthersYT] Fetching Database...");
        VTubersDB.open_collection("yt_other_livedata")
            .then(data_docs => {
                console.log("[OthersYT] Parsing Database...");
                let vtb_res: YTLiveArray<YouTubeData[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                console.log("[OthersYT] Filtering Database...")
                let final_mappings = parse_youtube_live_args(user_query, vtb_res);
                final_mappings["cached"] = true;
                console.log("[OthersYT] Sending...");
                res.json(final_mappings)
            })
            .catch(error => {
                console.log(error);
                res.status(500).json({message: "Internal server error occured."});
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal server error occured."});
    }
});


/**
 * @swagger
 * /other/youtube/channels:
 *  get:
 *      summary: Get Other VTubers YouTube Channel Info/Stats
 *      description: Fetch a list of Others VTubers YouTube channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Others
 *      produces:
 *      - application/json
 *      parameters:
 *      - in: query
 *        name: fields
 *        description: Filter fields that will be returned, multiples value are separated by comma
 *        required: false
 *        type: string
 *        enum:
 *        - id
 *        - name
 *        - description
 *        - publishedAt
 *        - thumbnail
 *        - subscriberCount
 *        - viewCount
 *        - videoCount
 *        - group
 *      - in: query
 *        name: group
 *        description: Filter groups that will be returned, multiples value are separated by comma
 *        required: false
 *        type: string
 *        enum:
 *        - vtuberesports
 *        - lupinusvg
 *        - irisblackgames
 *        - cattleyareginagames
 *        - nanashi
 *        - animare
 *        - vapart
 *        - honeystrap
 *        - sugarlyric
 *        - mahapanca
 *        - vivid
 *        - noripro
 *        - hanayori
 *        - voms
 *        - others
 *      - in: query
 *        name: sort
 *        description: Sort data by one of the values available.
 *        required: false
 *        type: string
 *        enum:
 *        - id
 *        - name
 *        - description
 *        - publishedAt
 *        - thumbnail
 *        - subscriberCount
 *        - viewCount
 *        - videoCount
 *        - group
 *      - in: query
 *        name: order
 *        description: Sort order.
 *        required: false
 *        type: string
 *        enum:
 *        - ascending
 *        - descending
 *      responses:
 *          '200':
 *              description: A list of channels.
 *              schema:
 *                  type: object
 *                  properties:
 *                      channels:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/YouTubeChannelModel'
 *                      cached:
 *                          type: boolean
 */
othersroutes.get("/youtube/channels", (req, res) => {
    let user_query = req.query;
    try {
        console.log("[OthersYT_Channels] Fetching Database...");
        VTubersDB.open_collection("yt_other_channels")
            .then(data_docs => {
                console.log("[OthersYT_Channels] Parsing Database...");
                let vtb_res: ChannelArray<YouTubeChannel> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                console.log("[OthersYT_Channels] Filtering Database...");
                let final_mappings = channel_filters(user_query, vtb_res);
                console.log("[OthersYT_Channels] Sending...");
                res.json(final_mappings)
            })
            .catch(error => {
                console.log(error);
                res.status(500).json({message: "Internal server error occured."});
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal server error occured."});
    }
});

export { othersroutes };