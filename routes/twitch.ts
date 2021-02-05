import * as express from "express";

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
    res.status(410).json({
        "message": "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        "error": "DEPRECATED",
        "code": 410,
        "info": {
            "deprecatedSince": "2021-01-14T23:59:59+09:00"
        }
    })
});

export { twitchroutes };