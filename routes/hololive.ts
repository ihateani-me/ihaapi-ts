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
    res.status(410).json({
        "message": "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        "error": "DEPRECATED",
        "code": 410,
        "info": {
            "deprecatedSince": "2021-01-14T23:59:59+09:00"
        }
    })
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
    res.status(410).json({
        "message": "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        "error": "DEPRECATED",
        "code": 410,
        "info": {
            "deprecatedSince": "2021-01-14T23:59:59+09:00"
        }
    })
});

export { holoroutes };