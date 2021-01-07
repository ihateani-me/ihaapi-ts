import * as express from "express";
import { VTDB } from "../dbconn";
import { parse_youtube_live_args, bilibili_use_uuids, channel_filters, get_group } from "../utils/filters";
import { filter_empty, getValueFromKey, sortObjectsByKey } from "../utils/swissknife";
import { LiveMap, BilibiliData } from "../utils/models";
import _ from "lodash";
import { logger as TopLogger } from "../utils/logger";
const MainLogger = TopLogger.child({cls: "Routes.Nijisanji"});
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
    const logger = MainLogger.child({fn: "live"});
    let user_query = req.query;
    res.header({
        "Cache-Control": "public, max-age=60, immutable"
    });
    try {
        logger.info("Fetching Database...");
        VTDB.fetchVideos("bilibili", get_group("nijisanji"))
            .then(([live, upcoming, past]) => {
                logger.info("Parsing Database...");
                let final_mappings: LiveMap<BilibiliData[]> = {};
                logger.info("Filtering Database...");
                // @ts-ignore
                final_mappings["live"] = sortObjectsByKey(bilibili_use_uuids(user_query.uuid, live), "startTime");
                // @ts-ignore
                final_mappings["upcoming"] = sortObjectsByKey(bilibili_use_uuids(user_query.uuid, upcoming), "startTime");
                // @ts-ignore
                final_mappings["past"] = sortObjectsByKey(bilibili_use_uuids(user_query.uuid, past), "endTime");
                final_mappings["cached"] = true;
                logger.info("Sending...");
                res.json(final_mappings)
            })
            .catch(error => {
                logger.error(error);
                res.status(500).json({message: "Internal server error occured."});
            });
    } catch (error) {
        logger.error(error);
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
    const logger = MainLogger.child({fn: "channels"});
    let user_query = req.query;
    try {
        logger.info("Fetching Database...");
        VTDB.fetchChannels("bilibili", get_group("nijisanji"))
            .then(data_docs => {
                logger.info("Filtering Database...");
                let final_mappings = channel_filters(user_query, data_docs);
                logger.info("Sending...");
                res.json(final_mappings);
            })
            .catch(error => {
                logger.error(error);
                res.status(500).json({message: "Internal server error occured."});
            });
    } catch (error) {
        logger.error(error);
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
    const logger = MainLogger.child({fn: "youtubeLive"});
    let user_query = req.query;
    let fetchedGroups = filter_empty(decodeURIComponent(getValueFromKey(user_query, "group", "")).split(","));
    let nijigroups: any[] = get_group("nijisanji");
    fetchedGroups = fetchedGroups.filter(group => nijigroups.includes(group));
    if (fetchedGroups.length < 1) {
        fetchedGroups = nijigroups;
    }
    try {
        logger.info("Fetching Database...");
        VTDB.fetchVideos("youtube", fetchedGroups)
            .then(([live, upcoming, ended]) => {
                logger.info("Parsing Database...");
                // @ts-ignore
                let data_docs = _.flattenDeep(_.concat(live, upcoming, ended));
                logger.info("Filtering Database...");
                // @ts-ignore
                let final_mappings = parse_youtube_live_args(user_query, data_docs);
                final_mappings["cached"] = true;
                logger.info("Sending...");
                res.json(final_mappings)
            })
            .catch(error => {
                logger.error(error);
                res.status(500).json({message: "Internal server error occured."});
            });
    } catch (error) {
        logger.error(error);
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
    const logger = MainLogger.child({fn: "youtubeChannels"});
    let user_query = req.query;
    try {
        logger.info("Fetching Database...");
        VTDB.fetchChannels("youtube", get_group("nijisanji"))
            .then(data_docs => {
                logger.info("Filtering Database...");
                let final_mappings = channel_filters(user_query, data_docs);
                logger.info("Sending...");
                res.json(final_mappings);
            })
            .catch(error => {
                logger.error(error);
                res.status(500).json({message: "Internal server error occured."});
            });
    } catch (error) {
        logger.error(error);
        res.status(500).json({message: "Internal server error occured."});
    }
});

export { nijiroutes };
