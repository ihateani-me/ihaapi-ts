import * as express from "express";
import _ from "lodash";
import { VTDB } from "../dbconn";
import { parse_youtube_live_args, bilibili_use_uuids, channel_filters, get_group, GROUPS_MAPPINGS } from "../utils/filters";
import { LiveMap, BilibiliData } from "../utils/models";
import { filter_empty, getValueFromKey } from "../utils/swissknife";
import { logger as TopLogger } from "../utils/logger";
const MainLogger = TopLogger.child({cls: "Routes.OthersVTuber"});
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
 *      deprecated: true
 *      description: Fetch a list of upcoming streams from BiliBili for Other VTubers, updated every 4 minutes.
 *      tags:
 *      - Others
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
othersroutes.get("/upcoming", (req, res) => {
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
 * /other/channels:
 *  get:
 *      summary: Get Other VTubers BiliBili Channel Info/Stats
 *      deprecated: true
 *      description: Fetch a list of Others VTubers BiliBili channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Others
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
othersroutes.get("/channels", (req, res) => {
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
 * /other/youtube/live:
 *  get:
 *      summary: Get Other VTubers YouTube Live Schedule
 *      deprecated: true
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
 *          - vtuberesports
 *          - lupinusvg
 *          - irisblackgames
 *          - cattleyareginagames
 *          - nanashi
 *          - animare
 *          - vapart
 *          - honeystrap
 *          - sugarlyric
 *          - mahapanca
 *          - vivid
 *          - noripro
 *          - hanayori
 *          - voms
 *          - others
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
othersroutes.get("/youtube/live", (req, res) => {
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
 * /other/youtube/channels:
 *  get:
 *      summary: Get Other VTubers YouTube Channel Info/Stats
 *      deprecated: true
 *      description: Fetch a list of Others VTubers YouTube channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Others
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
 *          - vtuberesports
 *          - lupinusvg
 *          - irisblackgames
 *          - cattleyareginagames
 *          - nanashi
 *          - animare
 *          - vapart
 *          - honeystrap
 *          - sugarlyric
 *          - mahapanca
 *          - vivid
 *          - noripro
 *          - hanayori
 *          - voms
 *          - others
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
othersroutes.get("/youtube/channels", (req, res) => {
    res.status(410).json({
        "message": "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        "error": "DEPRECATED",
        "code": 410,
        "info": {
            "deprecatedSince": "2021-01-14T23:59:59+09:00"
        }
    })
});

export { othersroutes };