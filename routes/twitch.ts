import * as express from "express";
import { VTubersDB } from "../dbconn";
import { channel_filters } from "../utils/filters";
import { sortObjectsByKey } from "../utils/swissknife";
import { ChannelArray, LiveMap, TwitchChannel, TwitchData } from "../utils/models";
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
    try {
        console.log("[Twitch] Fetching Database...");
        VTubersDB.open_collection("twitch_data")
            .then(data_docs => {
                console.log("[Twitch] Parsing Database...");
                let vtb_res: LiveMap<TwitchData[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                let final_mappings: LiveMap<TwitchData[]> = {};
                console.log("[Twitch] Filtering Database...");
                // @ts-ignore
                final_mappings["live"] = sortObjectsByKey(vtb_res["live"], "startTime");
                final_mappings["cached"] = true;
                console.log("[Twitch] Sending...");
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
    let user_query = req.query;
    try {
        console.log("[TwitchChannel] Fetching Database...");
        VTubersDB.open_collection("twitch_channels")
            .then(data_docs => {
                console.log("[TwitchChannel] Parsing Database...");
                let vtb_res: ChannelArray<TwitchChannel> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                console.log("[TwitchChannel] Filtering Database...");
                let final_mappings = channel_filters(user_query, vtb_res);
                console.log("[TwitchChannel] Sending...");
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

export { twitchroutes };