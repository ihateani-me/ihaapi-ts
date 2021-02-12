import * as express from "express";

const TwitcastingRoutes = express.Router();

/**
 * @swagger
 * /twitcasting/live:
 *  get:
 *      summary: Get Currently Live Twitcasting Streams
 *      deprecated: true
 *      description: Fetch a list of live streams from Twitcasting VTubers, updated every 1 minute.
 *      tags:
 *      - Twitcasting
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/twitcasting/live").json()
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
 *                                      $ref: '#/components/schemas/TwitcastingScheduleModel'
 *                              cached:
 *                                  type: boolean
 */
TwitcastingRoutes.get("/live", (req, res) => {
    res.status(410).json({
        message: "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        error: "DEPRECATED",
        code: 410,
        info: {
            deprecatedSince: "2021-01-14T23:59:59+09:00",
        },
    });
});

/**
 * @swagger
 * /twitcasting/channels:
 *  get:
 *      summary: Get Twitcasting Channel Info/Stats
 *      deprecated: true
 *      description: Fetch a list of VTubers Twitcasting channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Twitcasting
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
 *          - thumbnail
 *          - followerCount
 *          - level
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
 *          - thumbnail
 *          - followerCount
 *          - level
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
 *           res = requests.get("https://api.ihateani.me/twitcasting/channels").json()
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
 *                                      $ref: '#/components/schemas/TwitcastingChannelModel'
 *                              cached:
 *                                  type: boolean
 */
TwitcastingRoutes.get("/channels", (req, res) => {
    res.status(410).json({
        message: "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        error: "DEPRECATED",
        code: 410,
        info: {
            deprecatedSince: "2021-01-14T23:59:59+09:00",
        },
    });
});

export { TwitcastingRoutes };
