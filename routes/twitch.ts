import * as express from "express";
import { VTDB } from "../dbconn";
import { channel_filters, GROUPS_MAPPINGS } from "../utils/filters";
import { filter_empty, getValueFromKey, sortObjectsByKey } from "../utils/swissknife";
import { LiveMap, TwitchData } from "../utils/models";
import _ from "lodash";
import { logger as TopLogger } from "../utils/logger";
const MainLogger = TopLogger.child({cls: "Routes.Twitch"});
const twitchroutes = express.Router()

twitchroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD",
        "Cache-Control": "public, max-age=60, immutable"
    })
    next()
});

/**
 * @swagger
 * /twitch/live:
 *  get:
 *      summary: Get Currently Live Twitch Streams
 *      deprecated: true
 *      description: Fetch a list of live streams from Twitch VTubers, updated every 1 minute.
 *      tags:
 *      - Twitch
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/twitch/live").json()
 *           print(res["live"])
 *      responses:
 *          '200':
 *              description: A list of live streams
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              live:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/TwitchScheduleModel'
 *                              cached:
 *                                  type: boolean
 */
twitchroutes.get("/live", (req, res) => {
    const logger = MainLogger.child({fn: "live"});
    let user_query = req.query;
    let allgroups: any[] = _.flattenDeep(Object.values(GROUPS_MAPPINGS));
    let fetchedGroups = filter_empty(decodeURIComponent(getValueFromKey(user_query, "group", "")).split(","));
    if (fetchedGroups.length < 1) {
        fetchedGroups = allgroups;
    }
    try {
        logger.info("Fetching Database...");
        VTDB.fetchVideos("twitch", fetchedGroups)
            .then(([live, _u, ended]) => {
                let final_mappings: LiveMap<TwitchData[]> = {};
                logger.info("Filtering Database...");
                final_mappings["live"] = sortObjectsByKey(live, "startTime");
                final_mappings["ended"] = sortObjectsByKey(ended, "endTime");
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
 * /twitch/channels:
 *  get:
 *      summary: Get Twitch Channel Info/Stats
 *      deprecated: true
 *      description: Fetch a list of VTubers Twitch channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Twitch
 *      parameters:
 *      - in: query
 *        name: fields
 *        description: Filter fields that will be returned, multiples value are separated by comma
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - id
 *          - user_id
 *          - name
 *          - description
 *          - thumbnail
 *          - followerCount
 *          - viewCount
 *      - in: query
 *        name: sort
 *        description: Sort data by one of the values available.
 *        required: false
 *        schema:
 *          type: string
 *          enum:
 *          - id
 *          - user_id
 *          - name
 *          - description
 *          - thumbnail
 *          - followerCount
 *          - viewCount
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
 *           res = requests.get("https://api.ihateani.me/twitch/channels").json()
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
 *                                      $ref: '#/components/schemas/TwitchChannelModel'
 *                              cached:
 *                                  type: boolean
 */
twitchroutes.get("/channels", (req, res) => {
    const logger = MainLogger.child({fn: "channels"});
    let user_query = req.query;
    let allgroups: any[] = _.flattenDeep(Object.values(GROUPS_MAPPINGS));
    let fetchedGroups = filter_empty(decodeURIComponent(getValueFromKey(user_query, "group", "")).split(","));
    if (fetchedGroups.length < 1) {
        fetchedGroups = allgroups;
    }
    try {
        logger.info("Fetching Database...");
        VTDB.fetchChannels("twitch", fetchedGroups)
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

export { twitchroutes };