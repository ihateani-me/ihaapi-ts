import * as express from "express";
import { NijiTubeDB, VTubersDB } from "../dbconn";
import { parse_youtube_live_args, bilibili_use_uuids, sortLive, channel_filters } from "../utils/filters";
import { LiveMap, BilibiliData, YTLiveArray, YouTubeData, ChannelMap, YouTubeChannel, BiliBiliChannel, ChannelArray } from "../utils/models";
const nijiroutes = express.Router()

nijiroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

/**
 * @swagger
 * /nijisanji/live:
 *  get:
 *      summary: Get Nijisanji/VirtuaReal BiliBili Live Schedule
 *      description: Fetch a list of live/upcoming streams from BiliBili for Nijisanji/VirtuaReal VTubers, updated every 2 minutes for live data and 4 minutes for upcoming data.
 *      tags:
 *      - Nijisanji
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
 *              description: A list of live/upcoming streams
 *              schema:
 *                  type: object
 *                  properties:
 *                      live:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/BiliScheduleModel'
 *                      upcoming:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/BiliScheduleModel'
 *                      cached:
 *                          type: boolean
 */
nijiroutes.get("/live", (req, res) => {
    let user_query = req.query;
    res.header({
        "Cache-Control": "public, max-age=60, immutable"
    });
    try {
        console.log("[NijisanjiBili] Fetching Database...");
        VTubersDB.open_collection("nijisanji_data")
            .then(data_docs => {
                console.log("[NijisanjiBili] Parsing Database...");
                let vtb_res: LiveMap<BilibiliData[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                let final_mappings: LiveMap<BilibiliData[]> = {};
                console.log("[NijisanjiBili] Filtering Database...");
                // @ts-ignore
                final_mappings["live"] = sortLive(bilibili_use_uuids(user_query.uuid, vtb_res["live"]), "startTime");
                // @ts-ignore
                final_mappings["upcoming"] = bilibili_use_uuids(user_query.uuid, vtb_res["upcoming"]);
                final_mappings["cached"] = true;
                console.log("[NijisanjiBili] Sending...");
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
 * /nijisanji/channels:
 *  get:
 *      summary: Get Nijisanji/VirtuaReal BiliBili Channel Info/Stats
 *      description: Fetch a list of Nijisanji/VirtuaReal VTubers BiliBili channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Nijisanji
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
nijiroutes.get("/channels", (req, res) => {
    let user_query = req.query;
    try {
        console.log("[NijisanjiBili_Channels] Fetching Database...");
        VTubersDB.open_collection("nijisanji_data")
            .then(data_docs => {
                console.log("[NijisanjiBili_Channels] Parsing Database...");
                let vtb_res: ChannelMap<BiliBiliChannel[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                console.log("[NijisanjiBili_Channels] Filtering Database...");
                let final_mappings = channel_filters(user_query, vtb_res["channels"]);
                console.log("[NijisanjiBili_Channels] Sending...");
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
 * /nijisanji/youtube/live:
 *  get:
 *      summary: Get Nijisanji YouTube Live Schedule
 *      description: |
 *          Fetch a list of live/upcoming streams from Youtube for Nijisanji VTubers, updated every 1 minute for live data and 2 minutes for upcoming data.
 *       
 *          The results can be filtered by using Query parameters
 *          The query params can handle multiple values, separate them by using comma (,)
 *          For example: `/nijisanji/youtube/live?group=nijisanjien,nijisanjiid`
 * 
 *          Wrong parameters value will just be ignored and not gonna return error.
 *      tags:
 *      - Nijisanji
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
 *        - nijisanji
 *        - nijisanjiworld
 *        - nijisanjijp
 *        - nijisanjikr
 *        - nijisanjien
 *        - nijisanjiid
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
nijiroutes.get("/youtube/live", (req, res) => {
    let user_query = req.query;
    try {
        console.log("[NijisanjiYT] Fetching Database...");
        NijiTubeDB.open_collection("nijitube_live")
            .then(data_docs => {
                console.log("[NijisanjiYT] Parsing Database...");
                let vtb_res: YTLiveArray<YouTubeData[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                console.log("[NijisanjiYT] Filtering Database...")
                let final_mappings = parse_youtube_live_args(user_query, vtb_res);
                final_mappings["cached"] = true;
                console.log("[NijisanjiYT] Sending...");
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
 * /nijisanji/youtube/channels:
 *  get:
 *      summary: Get Nijisanji YouTube Channel Info/Stats
 *      description: Fetch a list of Nijisanji VTubers YouTube channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Nijisanji
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
 *        - nijisanji
 *        - nijisanjiworld
 *        - nijisanjijp
 *        - nijisanjikr
 *        - nijisanjien
 *        - nijisanjiid
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
nijiroutes.get("/youtube/channels", (req, res) => {
    let user_query = req.query;
    try {
        console.log("[NijisanjiYT_Channels] Fetching Database...");
        NijiTubeDB.open_collection("nijitube_channels")
            .then(data_docs => {
                console.log("[NijisanjiYT_Channels] Parsing Database...");
                let vtb_res: ChannelArray<YouTubeChannel> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                console.log("[NijisanjiYT_Channels] Filtering Database...");
                let final_mappings = channel_filters(user_query, vtb_res);
                console.log("[NijisanjiYT_Channels] Sending...");
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

export { nijiroutes };
