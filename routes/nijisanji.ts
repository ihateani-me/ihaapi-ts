import * as express from "express";
import { VTDB } from "../dbconn";
import { parse_youtube_live_args, bilibili_use_uuids, channel_filters, get_group } from "../utils/filters";
import { filter_empty, getValueFromKey, sortObjectsByKey } from "../utils/swissknife";
import { LiveMap, BilibiliData, YTLiveArray, YouTubeData, ChannelMap, YouTubeChannel, BiliBiliChannel, ChannelArray } from "../utils/models";
import _ from "lodash";
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
 *      deprecated: true
 *      description: Fetch a list of live/upcoming streams from BiliBili for Nijisanji/VirtuaReal VTubers, updated every 2 minutes for live data and 4 minutes for upcoming data.
 *      tags:
 *      - Nijisanji
 *      parameters:
 *      - in: query
 *        name: uids
 *        description: Filter upcoming results with User ID (support multiple id separated by comma)
 *        required: false
 *        schema:
 *          type: string
 *      responses:
 *          '200':
 *              description: A list of live/upcoming streams
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              live:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/BiliScheduleModel'
 *                              upcoming:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/BiliScheduleModel'
 *                              cached:
 *                                  type: boolean
 */
nijiroutes.get("/live", (req, res) => {
    let user_query = req.query;
    res.header({
        "Cache-Control": "public, max-age=60, immutable"
    });
    try {
        console.log("[NijisanjiBili] Fetching Database...");
        VTDB.fetchVideos("bilibili", get_group("nijisanji"))
            .then(([live, upcoming, past]) => {
                console.log("[NijisanjiBili] Parsing Database...");
                let final_mappings: LiveMap<BilibiliData[]> = {};
                console.log("[NijisanjiBili] Filtering Database...");
                // @ts-ignore
                final_mappings["live"] = sortObjectsByKey(bilibili_use_uuids(user_query.uuid, live), "startTime");
                // @ts-ignore
                final_mappings["upcoming"] = sortObjectsByKey(bilibili_use_uuids(user_query.uuid, upcoming), "startTime");
                // @ts-ignore
                final_mappings["past"] = sortObjectsByKey(bilibili_use_uuids(user_query.uuid, past), "endTime");
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
 *      deprecated: true
 *      description: Fetch a list of Nijisanji/VirtuaReal VTubers BiliBili channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Nijisanji
 *      parameters:
 *      - in: query
 *        name: fields
 *        description: Filter fields that will be returned, multiples value are separated by comma
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - id
 *          - room_id
 *          - name
 *          - description
 *          - thumbnail
 *          - subscriberCount
 *          - viewCount
 *          - videoCount
 *          - live
 *      - in: query
 *        name: sort
 *        description: Sort data by one of the values available.
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - id
 *          - room_id
 *          - name
 *          - description
 *          - thumbnail
 *          - subscriberCount
 *          - viewCount
 *          - videoCount
 *      - in: query
 *        name: order
 *        description: Sort order.
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - ascending
 *          - descending
 *      responses:
 *          '200':
 *              description: A list of channels.
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              channels:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/BiliBiliChannelModel'
 *                              cached:
 *                                  type: boolean
 */
nijiroutes.get("/channels", (req, res) => {
    let user_query = req.query;
    try {
        console.log("[NijisanjiBili_Channels] Fetching Database...");
        VTDB.fetchChannels("bilibili", get_group("nijisanji"))
            .then(data_docs => {
                console.log("[NijisanjiBili_Channels] Filtering Database...");
                let final_mappings = channel_filters(user_query, data_docs);
                console.log("[NijisanjiBili_Channels] Sending...");
                res.json(final_mappings);
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
 *      deprecated: true
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
 *      parameters:
 *      - in: query
 *        name: status
 *        description: Filter status (live/upcoming/ended) that will be returned, multiples value are separated by comma
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - live
 *          - upcoming
 *          - ended
 *      - in: query
 *        name: group
 *        description: Filter groups that will be returned, multiples value are separated by comma
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - nijisanji
 *          - nijisanjiworld
 *          - nijisanjijp
 *          - nijisanjikr
 *          - nijisanjien
 *          - nijisanjiid
 *      - in: query
 *        name: fields
 *        description: Filter fields that will be returned, multiples value are separated by comma
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - id
 *          - title
 *          - startTime
 *          - endTime
 *          - status
 *          - thumbnail
 *          - viewers
 *          - channel
 *      responses:
 *          '200':
 *              description: A list of live/upcoming/ended streams
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              live:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/YouTubeScheduleModel'
 *                              upcoming:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/YouTubeScheduleModel'
 *                              ended:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/YouTubeScheduleModel'
 *                              cached:
 *                                  type: boolean
 */
nijiroutes.get("/youtube/live", (req, res) => {
    let user_query = req.query;
    let fetchedGroups = filter_empty(decodeURIComponent(getValueFromKey(user_query, "group", "")).split(","));
    let nijigroups: any[] = get_group("nijisanji");
    fetchedGroups = fetchedGroups.filter(group => nijigroups.includes(group));
    if (fetchedGroups.length < 1) {
        fetchedGroups = nijigroups;
    }
    try {
        console.log("[NijisanjiYT] Fetching Database...");
        VTDB.fetchVideos("youtube", fetchedGroups)
            .then(([live, upcoming, ended]) => {
                console.log("[NijisanjiYT] Parsing Database...");
                let data_docs = _.flattenDeep(_.concat(live, upcoming, ended));
                console.log("[NijisanjiYT] Filtering Database...");
                // @ts-ignore
                let final_mappings = parse_youtube_live_args(user_query, data_docs);
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
 *      deprecated: true
 *      description: Fetch a list of Nijisanji VTubers YouTube channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Nijisanji
 *      parameters:
 *      - in: query
 *        name: fields
 *        description: Filter fields that will be returned, multiples value are separated by comma
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - id
 *          - name
 *          - description
 *          - publishedAt
 *          - thumbnail
 *          - subscriberCount
 *          - viewCount
 *          - videoCount
 *          - group
 *      - in: query
 *        name: group
 *        description: Filter groups that will be returned, multiples value are separated by comma
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - nijisanji
 *          - nijisanjiworld
 *          - nijisanjijp
 *          - nijisanjikr
 *          - nijisanjien
 *          - nijisanjiid
 *      - in: query
 *        name: sort
 *        description: Sort data by one of the values available.
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - id
 *          - name
 *          - description
 *          - publishedAt
 *          - thumbnail
 *          - subscriberCount
 *          - viewCount
 *          - videoCount
 *          - group
 *      - in: query
 *        name: order
 *        description: Sort order.
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - ascending
 *          - descending
 *      responses:
 *          '200':
 *              description: A list of channels.
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              channels:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/YouTubeChannelModel'
 *                              cached:
 *                                  type: boolean
 */
nijiroutes.get("/youtube/channels", (req, res) => {
    let user_query = req.query;
    try {
        console.log("[NijisanjiYT_Channels] Fetching Database...");
        VTDB.fetchChannels("youtube", get_group("nijisanji"))
            .then(data_docs => {
                console.log("[NijisanjiYT_Channels] Filtering Database...");
                let final_mappings = channel_filters(user_query, data_docs);
                console.log("[NijisanjiYT_Channels] Sending...");
                res.json(final_mappings);
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
