import * as express from "express";
import { VTubersDB } from "../dbconn";
import { channel_filters, sortLive } from "../utils/filters";
import { ChannelArray, LiveMap, TwitcastingChannel, TwitcastingData } from "../utils/models";
const twitcastroutes = express.Router()

twitcastroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD",
        "Cache-Control": "public, max-age=60, immutable"
    })
    next()
});

/**
 * @swagger
 * /twitcasting/live:
 *  get:
 *      summary: Get Currently Live Twitcasting Streams
 *      description: Fetch a list of live streams from Twitcasting VTubers, updated every 1 minute.
 *      tags:
 *      - Twitcasting
 *      produces:
 *      - application/json
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
 *              schema:
 *                  type: object
 *                  properties:
 *                      live:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/TwitcastingScheduleModel'
 *                      cached:
 *                          type: boolean
 */
twitcastroutes.get("/live", (req, res) => {
    try {
        console.log("[Twitcasting] Fetching Database...");
        VTubersDB.open_collection("twitcasting_data")
            .then(data_docs => {
                console.log("[Twitcasting] Parsing Database...");
                let vtb_res: LiveMap<TwitcastingData[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                let final_mappings: LiveMap<TwitcastingData[]> = {};
                console.log("[Twitcasting] Filtering Database...");
                // @ts-ignore
                final_mappings["live"] = sortLive(vtb_res["live"], "startTime");
                final_mappings["cached"] = true;
                console.log("[Twitcasting] Sending...");
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
 * /twitcasting/channels:
 *  get:
 *      summary: Get Twitcasting Channel Info/Stats
 *      description: Fetch a list of VTubers Twitcasting channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Twitcasting
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
 *        - thumbnail
 *        - followerCount
 *        - level
 *      - in: query
 *        name: sort
 *        description: Sort data by one of the values available.
 *        required: false
 *        type: string
 *        enum:
 *        - id
 *        - name
 *        - description
 *        - thumbnail
 *        - followerCount
 *        - level
 *      - in: query
 *        name: order
 *        description: Sort order.
 *        required: false
 *        type: string
 *        enum:
 *        - ascending
 *        - descending
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
 *              schema:
 *                  type: object
 *                  properties:
 *                      channels:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/TwitcastingChannelModel'
 *                      cached:
 *                          type: boolean
 */
twitcastroutes.get("/channels", (req, res) => {
    let user_query = req.query;
    try {
        console.log("[TwitcastingChannel] Fetching Database...");
        VTubersDB.open_collection("twitcasting_channels")
            .then(data_docs => {
                console.log("[TwitcastingChannel] Parsing Database...");
                let vtb_res: ChannelArray<TwitcastingChannel> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                console.log("[TwitcastingChannel] Filtering Database...");
                let final_mappings = channel_filters(user_query, vtb_res);
                console.log("[TwitcastingChannel] Sending...");
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

export { twitcastroutes };