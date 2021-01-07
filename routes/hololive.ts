import * as express from "express";
import { VTDB } from "../dbconn";
import { bilibili_use_uuids, channel_filters, get_group } from "../utils/filters";
import { sortObjectsByKey } from "../utils/swissknife";
import { LiveMap, BilibiliData } from "../utils/models";
import { logger as TopLogger } from "../utils/logger";
const MainLogger = TopLogger.child({cls: "Routes.Hololive"});
const holoroutes = express.Router();

holoroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

/**
 * @swagger
 * /live:
 *  get:
 *      summary: Get HoloPro BiliBili Live Schedule
 *      deprecated: true
 *      description: Fetch a list of live/upcoming streams from BiliBili for HoloPro VTubers, updated every 2 minutes for live data and 4 minutes for upcoming data.
 *      tags:
 *      - Hololive
 *      parameters:
 *      - in: query
 *        name: uids
 *        description: Filter upcoming results with User ID (support multiple id separated by comma)
 *        required: false
 *        schema:
 *          type: string
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/live").json()
 *           print(res["live"])
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
holoroutes.get("/live", (req, res) => {
    const logger = MainLogger.child({fn: "live"});
    let user_query = req.query;
    res.header({
        "Cache-Control": "public, max-age=60, immutable"
    });
    try {
        logger.info("Fetching Database...");
        VTDB.fetchVideos("bilibili", get_group("holopro"))
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
 * /channels:
 *  get:
 *      summary: Get HoloPro BiliBili Channel Info/Stats
 *      deprecated: true
 *      description: Fetch a list of HoloPro VTubers BiliBili channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Hololive
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
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/channels").json()
 *           print(res["channels"])
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
holoroutes.get("/channels", (req, res) => {
    const logger = MainLogger.child({fn: "channels"});
    let user_query = req.query;
    try {
        logger.info("Fetching Database...");
        VTDB.fetchChannels("bilibili", get_group("holopro"))
            .then(data_docs => {
                logger.info("Filtering Database...");
                let final_mappings = channel_filters(user_query, data_docs);
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

export { holoroutes };